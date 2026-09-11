const express = require('express');
const Payroll = require('../models/Payroll');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const { protect, authorize } = require('../middleware/auth');
const { newDocument, streamPdf, drawBrandHeader, labelValue, drawTableHeader, drawTableRow, bdt } = require('../utils/pdf');
const router = express.Router();

// Every this-many "late" days in a month costs the employee this fraction
// of their base salary (e.g. 4 late days => 1% deducted).
const LATE_DAYS_PER_PENALTY = 4;
const LATE_PENALTY_RATE = 0.01;

// A half-day is worked at half pay, so it costs half of one day's rate.
const HALF_DAY_DEDUCTION_FRACTION = 0.5;

// How many whole penalty units a given number of late days earns, e.g.
// 4-7 late days => 1 unit, 8-11 => 2 units, etc.
function lateDeductionUnits(lateCount) {
  return Math.floor(lateCount / LATE_DAYS_PER_PENALTY);
}

// Actual number of calendar days in the given 'YYYY-MM' month, so the daily
// rate is accurate whether it's a 28, 29, 30 or 31 day month.
function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

router.use(protect);

// Employees can see their own payslips; admin manages everything.
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.month) filter.month = req.query.month;
    if (req.user.role !== 'admin') {
      filter.employee = req.user._id;
    } else if (req.query.employee) {
      filter.employee = req.query.employee;
    }
    const records = await Payroll.find(filter).populate('employee', 'name email department designation').sort({ month: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch payroll records', error: err.message });
  }
});

router.use(authorize('admin'));

// Generate (or regenerate) draft payroll for every active employee with a
// monthly salary set, for the given month. Skips employees who already
// have a record for that month — unless `regenerate` is set, in which case
// any existing *pending* records for the month are deleted first so they
// get rebuilt from the latest attendance data. Records already marked
// `paid` are always left untouched, since they represent money that has
// actually gone out — regenerating never overwrites a paid payslip.
router.post('/generate', async (req, res) => {
  try {
    const { month, regenerate } = req.body; // 'YYYY-MM'
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ message: 'A valid month (YYYY-MM) is required' });
    }

    let removed = 0;
    if (regenerate) {
      const deleteResult = await Payroll.deleteMany({ month, status: { $ne: 'paid' } });
      removed = deleteResult.deletedCount || 0;
    }

    const employees = await User.find({
      isActive: true,
      monthlySalary: { $ne: null, $gt: 0 },
    });
    const existing = await Payroll.find({ month }).select('employee');
    const existingIds = new Set(existing.map((e) => String(e.employee)));
    const employeesToPay = employees.filter((emp) => !existingIds.has(String(emp._id)));

    // Count every attendance status this month per employee. 'present' and
    // 'late' days are both full attendance (late just also carries its own
    // penalty below); 'half-day' is half attendance; 'leave' and 'holiday'
    // are excused and never deduct anything; 'absent' is a full day's pay
    // cut at the employee's daily rate for this month (monthlySalary / days
    // in month). Any calendar day in the month with no attendance record at
    // all (admin never marked it — shown as "N/A" on the calendar) is
    // treated the same as an absence for pay purposes: the employee is only
    // paid for days that were actually recorded.
    const [y, m] = month.split('-').map(Number);
    const monthStart = new Date(y, m - 1, 1);
    const monthEnd = new Date(y, m, 1);
    const attendanceCounts = await Attendance.aggregate([
      {
        $match: {
          employee: { $in: employeesToPay.map((emp) => emp._id) },
          date: { $gte: monthStart, $lt: monthEnd },
        },
      },
      { $group: { _id: { employee: '$employee', status: '$status' }, count: { $sum: 1 } } },
    ]);
    const countsByEmployee = new Map(); // employeeId -> { present, late, 'half-day', absent, leave, holiday }
    attendanceCounts.forEach((row) => {
      const id = String(row._id.employee);
      if (!countsByEmployee.has(id)) countsByEmployee.set(id, {});
      countsByEmployee.get(id)[row._id.status] = row.count;
    });
    const monthDays = daysInMonth(y, m);

    const toCreate = employeesToPay.map((emp) => {
      const counts = countsByEmployee.get(String(emp._id)) || {};
      const presentCount = counts.present || 0;
      const lateCount = counts.late || 0;
      const halfDayCount = counts['half-day'] || 0;
      const absentCount = counts.absent || 0;
      const leaveCount = counts.leave || 0;
      const holidayCount = counts.holiday || 0;
      // "Present" attendance for payroll purposes: full presence plus
      // late arrivals, both of which are a full day worked.
      const totalPresentDays = presentCount + lateCount;

      // Any day in the month that isn't accounted for by any attendance
      // status at all is unset ("N/A") — never marked by an admin/manager.
      const recordedDays = presentCount + lateCount + halfDayCount + absentCount + leaveCount + holidayCount;
      const unsetCount = Math.max(0, monthDays - recordedDays);

      const dailyRate = Math.round((emp.monthlySalary / monthDays) * 100) / 100;

      const units = lateDeductionUnits(lateCount);
      const lateDeduction = Math.round(emp.monthlySalary * LATE_PENALTY_RATE * units * 100) / 100;
      const halfDayDeduction = Math.round(dailyRate * HALF_DAY_DEDUCTION_FRACTION * halfDayCount * 100) / 100;
      const absentDeduction = Math.round(dailyRate * absentCount * 100) / 100;
      // Unset days are unpaid, just like an absence — the employee is only
      // paid for the days that actually have attendance recorded.
      const unsetDeduction = Math.round(dailyRate * unsetCount * 100) / 100;
      const deductions =
        Math.round((lateDeduction + halfDayDeduction + absentDeduction + unsetDeduction) * 100) / 100;

      const noteLines = [];
      noteLines.push(
        `Present: ${totalPresentDays} day(s) this month (${presentCount} full, ${lateCount} late) out of ${monthDays}.`
      );
      if (units > 0) {
        noteLines.push(`Late deduction: ${lateCount} late day(s) this month (-${units * LATE_PENALTY_RATE * 100}% salary).`);
      }
      if (halfDayCount > 0) {
        noteLines.push(
          `Half-day deduction: ${halfDayCount} half-day(s) x ${bdt(dailyRate * HALF_DAY_DEDUCTION_FRACTION)}/day = ${bdt(
            halfDayDeduction
          )}.`
        );
      }
      if (absentCount > 0) {
        noteLines.push(`Absent deduction: ${absentCount} absent day(s) x ${bdt(dailyRate)}/day = ${bdt(absentDeduction)}.`);
      }
      if (unsetCount > 0) {
        noteLines.push(
          `Unset (N/A) deduction: ${unsetCount} day(s) with no attendance recorded x ${bdt(dailyRate)}/day = ${bdt(
            unsetDeduction
          )}.`
        );
      }
      if (leaveCount > 0 || holidayCount > 0) {
        noteLines.push(
          `No deduction for ${leaveCount} leave day(s) and ${holidayCount} holiday(s).`
        );
      }

      return {
        employee: emp._id,
        month,
        baseSalary: emp.monthlySalary,
        allowances: 0,
        bonus: 0,
        deductions,
        attendance: {
          presentDays: totalPresentDays,
          lateDays: lateCount,
          halfDays: halfDayCount,
          absentDays: absentCount,
          leaveDays: leaveCount,
          holidayDays: holidayCount,
          unsetDays: unsetCount,
          totalDaysInMonth: monthDays,
          dailyRate,
          lateDeduction,
          halfDayDeduction,
          absentDeduction,
          unsetDeduction,
        },
        status: 'pending',
        notes: noteLines.join(' '),
        generatedBy: req.user._id,
      };
    });
    const created = toCreate.length ? await Payroll.insertMany(toCreate) : [];
    res.status(201).json({
      created: created.length,
      skipped: employees.length - created.length,
      removed,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to generate payroll', error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { baseSalary, allowances, bonus, deductions, status, notes } = req.body;
    const record = await Payroll.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Payroll record not found' });
    if (baseSalary !== undefined) record.baseSalary = baseSalary;
    if (allowances !== undefined) record.allowances = allowances;
    if (bonus !== undefined) record.bonus = bonus;
    if (deductions !== undefined) record.deductions = deductions;
    if (notes !== undefined) record.notes = notes;
    if (status !== undefined && Payroll.STATUS_VALUES.includes(status)) {
      record.status = status;
      record.paidOn = status === 'paid' ? new Date() : null;
    }
    await record.save();
    res.json(await record.populate('employee', 'name email department designation'));
  } catch (err) {
    res.status(500).json({ message: 'Failed to update payroll record', error: err.message });
  }
});

router.patch('/:id/mark-paid', async (req, res) => {
  try {
    const record = await Payroll.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Payroll record not found' });
    record.status = 'paid';
    record.paidOn = new Date();
    await record.save();
    res.json(record);
  } catch (err) {
    res.status(500).json({ message: 'Failed to mark payroll as paid', error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const record = await Payroll.findByIdAndDelete(req.params.id);
    if (!record) return res.status(404).json({ message: 'Payroll record not found' });
    res.json({ message: 'Payroll record deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete payroll record', error: err.message });
  }
});

router.get('/:id/pdf', async (req, res) => {
  try {
    const record = await Payroll.findById(req.params.id).populate('employee', 'name email department designation');
    if (!record) return res.status(404).json({ message: 'Payroll record not found' });

    const [year, monthNum] = record.month.split('-').map(Number);
    const monthLabel = new Date(year, monthNum - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

    const doc = newDocument();
    streamPdf(res, doc, `Payslip-${record.employee?.name || 'employee'}-${record.month}.pdf`);

    drawBrandHeader(doc, 'PAYSLIP', monthLabel);

    const infoY = 130;
    labelValue(doc, 50, infoY, 'Employee', record.employee?.name || '—', { bold: true, width: 240 });
    doc.fillColor('#6b7280').font('Helvetica').fontSize(9.5).text(record.employee?.email || '', 50, doc.y + 2);
    if (record.employee?.designation || record.employee?.department) {
      doc
        .fillColor('#6b7280')
        .font('Helvetica')
        .fontSize(9.5)
        .text([record.employee?.designation, record.employee?.department].filter(Boolean).join(' · '), 50, doc.y + 2);
    }
    labelValue(doc, 330, infoY, 'Status', record.status.toUpperCase(), { width: 100 });
    labelValue(doc, 430, infoY, 'Pay Period', monthLabel, { width: 115 });
    const attForInfo = record.attendance || {};
    if (attForInfo.totalDaysInMonth > 0) {
      labelValue(
        doc,
        330,
        infoY + 46,
        'Present Days',
        `${attForInfo.presentDays || 0} / ${attForInfo.totalDaysInMonth}`,
        { width: 100 }
      );
    }
    if (record.paidOn) {
      labelValue(doc, 430, infoY + 46, 'Paid On', new Date(record.paidOn).toLocaleDateString(), { width: 115 });
    }

    const tableX = 50;
    const columns = [
      { key: 'label', label: 'Earnings', x: 0, width: 380 },
      { key: 'amount', label: 'Amount', x: 380, width: 115, align: 'right' },
    ];
    let y = infoY + 100;
    drawTableHeader(doc, tableX, y, columns);
    y += 24;
    drawTableRow(doc, tableX, y, columns, ['Base Salary', bdt(record.baseSalary)]);
    y += 20;
    if (record.allowances > 0) {
      drawTableRow(doc, tableX, y, columns, ['Allowances', bdt(record.allowances)]);
      y += 20;
    }
    if (record.bonus > 0) {
      drawTableRow(doc, tableX, y, columns, ['Bonus', bdt(record.bonus)]);
      y += 20;
    }

    y += 10;
    const deductionColumns = [
      { key: 'label', label: 'Deductions', x: 0, width: 380 },
      { key: 'amount', label: 'Amount', x: 380, width: 115, align: 'right' },
    ];
    drawTableHeader(doc, tableX, y, deductionColumns);
    y += 24;
    const att = record.attendance || {};
    if (att.lateDays > 0) {
      drawTableRow(doc, tableX, y, deductionColumns, [
        `Late arrival (${att.lateDays} day${att.lateDays === 1 ? '' : 's'})`,
        bdt(att.lateDeduction),
      ]);
      y += 20;
    }
    if (att.halfDays > 0) {
      drawTableRow(doc, tableX, y, deductionColumns, [
        `Half-day (${att.halfDays} day${att.halfDays === 1 ? '' : 's'} x ${bdt(att.dailyRate * 0.5)}/day)`,
        bdt(att.halfDayDeduction),
      ]);
      y += 20;
    }
    if (att.absentDays > 0) {
      drawTableRow(doc, tableX, y, deductionColumns, [
        `Absence (${att.absentDays} day${att.absentDays === 1 ? '' : 's'} x ${bdt(att.dailyRate)}/day)`,
        bdt(att.absentDeduction),
      ]);
      y += 20;
    }
    if (att.unsetDays > 0) {
      drawTableRow(doc, tableX, y, deductionColumns, [
        `Not recorded / N/A (${att.unsetDays} day${att.unsetDays === 1 ? '' : 's'} x ${bdt(att.dailyRate)}/day)`,
        bdt(att.unsetDeduction),
      ]);
      y += 20;
    }
    const otherDeductions = Math.max(
      0,
      (record.deductions || 0) -
        (att.lateDeduction || 0) -
        (att.halfDayDeduction || 0) -
        (att.absentDeduction || 0) -
        (att.unsetDeduction || 0)
    );
    if (otherDeductions > 0.004) {
      drawTableRow(doc, tableX, y, deductionColumns, ['Other deductions', bdt(otherDeductions)]);
      y += 20;
    }
    if (
      !(att.lateDays > 0) &&
      !(att.halfDays > 0) &&
      !(att.absentDays > 0) &&
      !(att.unsetDays > 0) &&
      otherDeductions <= 0.004
    ) {
      doc.fillColor('#6b7280').font('Helvetica').fontSize(10).text('No deductions this period.', tableX, y);
      y += 20;
    }

    y += 14;
    doc.moveTo(tableX, y).lineTo(545, y).strokeColor('#e2e5ea').lineWidth(1).stroke();
    y += 14;

    doc.fillColor('#1a2028').font('Helvetica-Bold').fontSize(13).text('Net Pay', tableX, y);
    doc.fillColor('#0e7c86').font('Helvetica-Bold').fontSize(16).text(bdt(record.netPay), tableX + 380, y - 2, { width: 115, align: 'right' });
    y += 30;

    if (att.absentDays > 0 || att.lateDays > 0 || att.halfDays > 0 || att.unsetDays > 0) {
      doc
        .fillColor('#6b7280')
        .font('Helvetica')
        .fontSize(8.5)
        .text(
          `Daily rate for this period: ${bdt(att.dailyRate)}/day, based on a ${monthLabel} salary of ${bdt(record.baseSalary)}.`,
          tableX,
          y,
          { width: 495 }
        );
      y = doc.y + 8;
    }

    if (record.notes) {
      doc.fillColor('#6b7280').font('Helvetica-Bold').fontSize(8.5).text('NOTES', tableX, y);
      doc.fillColor('#1a2028').font('Helvetica').fontSize(10).text(record.notes, tableX, y + 14, { width: 495 });
    }

    doc.end();
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ message: 'Failed to generate payslip PDF', error: err.message });
    } else {
      res.end();
    }
  }
});

module.exports = router;
