import { useState } from 'react';
import Modal from './Modal';
import { fieldWrap, labelStyle, inputStyle, primaryBtn, secondaryBtn, errorBanner } from './formStyles';
import { exactBDT } from '../utils/currency';

export default function PayrollEditModal({ record, onClose, onSaved, onSubmit }) {
  const [form, setForm] = useState({
    baseSalary: record.baseSalary ?? 0,
    allowances: record.allowances ?? 0,
    bonus: record.bonus ?? 0,
    deductions: record.deductions ?? 0,
    status: record.status || 'pending',
    notes: record.notes || '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const update = (key) => (e) =>
    setForm((f) => ({
      ...f,
      [key]: e.target.value,
    }));

  const netPay = Math.max(
    0,
    (Number(form.baseSalary) || 0) + (Number(form.allowances) || 0) + (Number(form.bonus) || 0) - (Number(form.deductions) || 0)
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await onSubmit(
        {
          baseSalary: Number(form.baseSalary) || 0,
          allowances: Number(form.allowances) || 0,
          bonus: Number(form.bonus) || 0,
          deductions: Number(form.deductions) || 0,
          status: form.status,
          notes: form.notes,
        },
        record._id
      );
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong while saving this payslip.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`Payslip — ${record.employee?.name} · ${record.month}`} onClose={onClose} width={480}>
      <style>{`
        .form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        @media (max-width: 480px) { .form-grid-2 { grid-template-columns: 1fr; } }
      `}</style>
      <form onSubmit={handleSubmit}>
        {error && <div style={errorBanner}>{error}</div>}

        {record.attendance?.totalDaysInMonth > 0 && (
          <div
            style={{
              background: 'var(--bg-inset)',
              border: '1px solid var(--border-hairline)',
              borderRadius: 8,
              padding: '10px 14px',
              marginBottom: 16,
              fontSize: 12,
              color: 'var(--text-secondary)',
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 4, color: 'var(--text-primary)' }}>
              Attendance ({record.attendance.presentDays || 0} present / {record.attendance.totalDaysInMonth} days)
            </div>
            {record.attendance.absentDays > 0 && (
              <div>
                {record.attendance.absentDays} absent day(s) × {exactBDT(record.attendance.dailyRate)}/day ={' '}
                {exactBDT(record.attendance.absentDeduction)}
              </div>
            )}
            {record.attendance.halfDays > 0 && (
              <div>
                {record.attendance.halfDays} half-day(s) × {exactBDT(record.attendance.dailyRate * 0.5)}/day ={' '}
                {exactBDT(record.attendance.halfDayDeduction)}
              </div>
            )}
            {record.attendance.lateDays > 0 && (
              <div>
                {record.attendance.lateDays} late day(s) = {exactBDT(record.attendance.lateDeduction)}
              </div>
            )}
            {record.attendance.unsetDays > 0 && (
              <div>
                {record.attendance.unsetDays} day(s) not recorded (N/A) × {exactBDT(record.attendance.dailyRate)}/day ={' '}
                {exactBDT(record.attendance.unsetDeduction)}
              </div>
            )}
            {(record.attendance.leaveDays > 0 || record.attendance.holidayDays > 0) && (
              <div>
                {record.attendance.leaveDays || 0} leave day(s), {record.attendance.holidayDays || 0} holiday(s) — no
                deduction
              </div>
            )}
            {(record.attendance.absentDays > 0 ||
              record.attendance.halfDays > 0 ||
              record.attendance.lateDays > 0 ||
              record.attendance.unsetDays > 0) && (
              <div style={{ marginTop: 4, fontSize: 11, color: 'var(--text-muted)' }}>
                Included in the Deductions total below — edit that field directly to adjust it.
              </div>
            )}
          </div>
        )}

        <div className="form-grid-2">
          <div style={fieldWrap}>
            <label style={labelStyle}>Base salary (৳)</label>
            <input type="number" min="0" step="0.01" style={inputStyle} value={form.baseSalary} onChange={update('baseSalary')} />
          </div>
          <div style={fieldWrap}>
            <label style={labelStyle}>Allowances (৳)</label>
            <input type="number" min="0" step="0.01" style={inputStyle} value={form.allowances} onChange={update('allowances')} />
          </div>
        </div>

        <div className="form-grid-2">
          <div style={fieldWrap}>
            <label style={labelStyle}>Bonus (৳)</label>
            <input type="number" min="0" step="0.01" style={inputStyle} value={form.bonus} onChange={update('bonus')} />
          </div>
          <div style={fieldWrap}>
            <label style={labelStyle}>Deductions (৳)</label>
            <input type="number" min="0" step="0.01" style={inputStyle} value={form.deductions} onChange={update('deductions')} />
          </div>
        </div>

        <div style={fieldWrap}>
          <label style={labelStyle}>Status</label>
          <select style={inputStyle} value={form.status} onChange={update('status')}>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
          </select>
        </div>

        <div style={fieldWrap}>
          <label style={labelStyle}>Notes</label>
          <textarea
            style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }}
            value={form.notes}
            onChange={update('notes')}
            placeholder="Optional"
          />
        </div>

        <div
          style={{
            background: 'var(--bg-inset)',
            border: '1px solid var(--border-hairline)',
            borderRadius: 8,
            padding: '12px 16px',
            marginBottom: 16,
            display: 'flex',
            justifyContent: 'space-between',
            fontWeight: 700,
            fontSize: 15,
          }}
        >
          <span>Net pay</span>
          <span className="mono">{exactBDT(netPay)}</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
          <button type="button" style={secondaryBtn} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" style={primaryBtn} disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
