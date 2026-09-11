import { useEffect, useMemo, useState } from 'react';
import PageShell from '../components/PageShell';
import PayrollEditModal from '../components/PayrollEditModal';
import Spinner from '../components/Spinner';
import SearchInput from '../components/SearchInput';
import api from '../api/axios';
import { downloadFile } from '../utils/download';
import { exactBDT } from '../utils/currency';
import { PAYROLL_STATUS_COLORS, pillStyle } from '../erp/badges';

const currentMonth = () => new Date().toISOString().slice(0, 7);

export default function Payroll() {
  const [month, setMonth] = useState(currentMonth());
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [banner, setBanner] = useState('');
  const [search, setSearch] = useState('');
  const [downloadingId, setDownloadingId] = useState(null);
  const [pdfError, setPdfError] = useState('');

  const handleDownloadPdf = async (record) => {
    setDownloadingId(record._id);
    setPdfError('');
    try {
      await downloadFile(`/payroll/${record._id}/pdf`, `Payslip-${record.employee?.name || 'employee'}-${record.month}.pdf`);
    } catch (err) {
      setPdfError(err.response?.data?.message || 'Failed to download this payslip PDF.');
    } finally {
      setDownloadingId(null);
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/payroll', { params: { month } });
      setRecords(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  const handleGenerate = async (regenerate = false) => {
    setGenerating(true);
    setBanner('');
    try {
      const res = await api.post('/payroll/generate', { month, regenerate });
      const parts = [`${res.data.created} payslip(s) generated`];
      if (regenerate && res.data.removed) {
        parts.push(`${res.data.removed} existing pending payslip(s) replaced with fresh attendance data`);
      }
      if (res.data.skipped) {
        parts.push(`${res.data.skipped} ${regenerate ? 'already marked paid, left unchanged' : 'already had a payslip this month'}`);
      }
      setBanner(`${parts.join(', ')}.`);
      load();
    } catch (err) {
      setBanner(err.response?.data?.message || 'Failed to generate payroll');
    } finally {
      setGenerating(false);
    }
  };

  const handleRegenerate = () => {
    const confirmed = window.confirm(
      `Regenerate payroll for ${month}? Every pending payslip for this month will be deleted and rebuilt from the latest attendance data. Any manual edits or notes on those payslips will be lost. Payslips already marked "paid" are never touched.`
    );
    if (!confirmed) return;
    handleGenerate(true);
  };

  const handleSubmit = async (form, id) => {
    await api.put(`/payroll/${id}`, form);
  };

  const markPaid = async (record) => {
    await api.patch(`/payroll/${record._id}/mark-paid`);
    load();
  };

  const filteredRecords = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return records;
    return records.filter((r) => {
      const name = (r.employee?.name || '').toLowerCase();
      const designation = (r.employee?.designation || '').toLowerCase();
      const department = (r.employee?.department || '').toLowerCase();
      return name.includes(q) || designation.includes(q) || department.includes(q);
    });
  }, [records, search]);

  const totals = useMemo(() => {
    const netTotal = filteredRecords.reduce((sum, r) => sum + r.netPay, 0);
    const paidTotal = filteredRecords.filter((r) => r.status === 'paid').reduce((sum, r) => sum + r.netPay, 0);
    return { netTotal, paidTotal, pendingTotal: netTotal - paidTotal };
  }, [filteredRecords]);

  return (
    <PageShell
      title="Payroll"
      subtitle="Generate and manage monthly payslips from employee salaries."
      actions={
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            style={{
              background: 'var(--bg-inset)',
              border: '1px solid var(--border-hairline)',
              borderRadius: 8,
              padding: '9px 12px',
              fontSize: 13.5,
              color: 'var(--text-primary)',
            }}
          />
          <button
            onClick={() => handleGenerate(false)}
            disabled={generating}
            style={{
              background: 'var(--accent-cyan)',
              color: 'var(--text-on-accent)',
              border: 'none',
              borderRadius: 8,
              padding: '10px 18px',
              fontSize: 13.5,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {generating ? 'Generating…' : 'Generate payroll'}
          </button>
          <button
            onClick={handleRegenerate}
            disabled={generating}
            title="Delete pending payslips for this month and rebuild them from the latest attendance data. Paid payslips are never touched."
            style={{
              background: 'transparent',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-hairline)',
              borderRadius: 8,
              padding: '10px 18px',
              fontSize: 13.5,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {generating ? 'Working…' : 'Regenerate payroll'}
          </button>
        </div>
      }
    >
      {banner && (
        <div
          style={{
            background: 'var(--bg-inset)',
            border: '1px solid var(--border-hairline)',
            borderRadius: 8,
            padding: '10px 14px',
            fontSize: 13,
            marginBottom: 16,
            color: 'var(--text-secondary)',
          }}
        >
          {banner}
        </div>
      )}

      {pdfError && (
        <div
          style={{
            background: 'rgba(239, 100, 97, 0.1)',
            border: '1px solid rgba(239, 100, 97, 0.35)',
            color: 'var(--text-error)',
            padding: '10px 12px',
            borderRadius: 8,
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          {pdfError}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 22 }}>
        <div style={cardStyle}>
          <div style={cardLabelStyle}>Total payroll</div>
          <div className="mono" style={{ fontSize: 22, fontWeight: 700 }}>
            {exactBDT(totals.netTotal)}
          </div>
        </div>
        <div style={cardStyle}>
          <div style={cardLabelStyle}>Paid out</div>
          <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: 'var(--status-delivered)' }}>
            {exactBDT(totals.paidTotal)}
          </div>
        </div>
        <div style={cardStyle}>
          <div style={cardLabelStyle}>Pending</div>
          <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: 'var(--status-hold)' }}>
            {exactBDT(totals.pendingTotal)}
          </div>
        </div>
      </div>

      <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 16 }}>
        Generating pulls the monthly salary set on each active employee's profile (Team &amp; Access) along with their
        attendance for the month. Present days (including late arrivals) are counted for reference; absent days are
        deducted at the employee's daily rate (monthly salary ÷ days in the month); half-days deduct half of that daily
        rate; every 4 late days deducts an extra 1% of base salary; leave and holidays are never deducted. If attendance
        gets corrected after payroll was already generated, use "Regenerate payroll" to rebuild pending payslips for the
        month from the latest attendance data — payslips already marked paid are always left untouched.
      </p>

      <div style={{ marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search payroll by employee, role, or department…" />
        {search && (
          <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
            {filteredRecords.length} of {records.length} match
          </span>
        )}
      </div>

      <div
        style={{
          background: 'var(--bg-panel)',
          border: '1px solid var(--border-hairline-soft)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          padding: 10,
        }}
      >
        <div style={{ overflowX: 'auto', maxHeight: 560, overflowY: 'auto', paddingRight: 6 }}>
          <table style={{ width: '100%', minWidth: 820, borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--bg-panel)' }}>
              <tr>
                {['Employee', 'Present', 'Base', 'Allowances + Bonus', 'Deductions', 'Net pay', 'Status', ''].map((h) => (
                  <th key={h} style={thStyle}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} style={{ padding: '40px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <Spinner label="Loading payroll…" />
                    </div>
                  </td>
                </tr>
              )}
              {!loading && records.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No payslips for this month yet — click "Generate payroll" to create them.
                  </td>
                </tr>
              )}
              {!loading && records.length > 0 && filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No payslips match "{search}".
                  </td>
                </tr>
              )}
              {filteredRecords.map((r) => (
                <tr key={r._id}>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 600 }}>{r.employee?.name}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{r.employee?.designation || r.employee?.department || ''}</div>
                  </td>
                  <td style={tdStyle} className="mono">
                    {r.attendance?.totalDaysInMonth > 0
                      ? `${r.attendance.presentDays || 0}/${r.attendance.totalDaysInMonth}`
                      : '—'}
                    {r.attendance?.halfDays > 0 && (
                      <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontFamily: 'var(--font-sans, inherit)', marginTop: 2 }}>
                        +{r.attendance.halfDays}d half-day
                      </div>
                    )}
                  </td>
                  <td style={tdStyle} className="mono">
                    {exactBDT(r.baseSalary)}
                  </td>
                  <td style={tdStyle} className="mono">
                    {exactBDT(r.allowances + r.bonus)}
                  </td>
                  <td style={tdStyle} className="mono">
                    {exactBDT(r.deductions)}
                    {(r.attendance?.absentDays > 0 ||
                      r.attendance?.lateDays > 0 ||
                      r.attendance?.halfDays > 0 ||
                      r.attendance?.unsetDays > 0) && (
                      <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontFamily: 'var(--font-sans, inherit)', marginTop: 2 }}>
                        {[
                          r.attendance.absentDays > 0 && `${r.attendance.absentDays}d absent`,
                          r.attendance.halfDays > 0 && `${r.attendance.halfDays}d half-day`,
                          r.attendance.lateDays > 0 && `${r.attendance.lateDays}d late`,
                          r.attendance.unsetDays > 0 && `${r.attendance.unsetDays}d N/A`,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </div>
                    )}
                  </td>
                  <td className="mono" style={{ ...tdStyle, fontWeight: 700 }}>
                    {exactBDT(r.netPay)}
                  </td>
                  <td style={tdStyle}>
                    <span style={pillStyle(PAYROLL_STATUS_COLORS[r.status])}>{r.status}</span>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => handleDownloadPdf(r)}
                        disabled={downloadingId === r._id}
                        style={iconBtnStyle}
                      >
                        {downloadingId === r._id ? 'Preparing…' : 'PDF'}
                      </button>
                      <button onClick={() => setEditingRecord(r)} style={iconBtnStyle}>
                        Edit
                      </button>
                      {r.status !== 'paid' && (
                        <button onClick={() => markPaid(r)} style={{ ...iconBtnStyle, color: 'var(--status-delivered)' }}>
                          Mark paid
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editingRecord && (
        <PayrollEditModal
          record={editingRecord}
          onClose={() => setEditingRecord(null)}
          onSaved={() => {
            setEditingRecord(null);
            load();
          }}
          onSubmit={handleSubmit}
        />
      )}
    </PageShell>
  );
}

const cardStyle = {
  background: 'var(--bg-panel)',
  border: '1px solid var(--border-hairline-soft)',
  borderRadius: 'var(--radius-lg)',
  padding: '14px 16px',
};
const cardLabelStyle = {
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: 6,
};
const thStyle = {
  textAlign: 'left',
  padding: '10px 16px',
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  borderBottom: '1px solid var(--border-hairline-soft)',
};
const tdStyle = {
  padding: '14px 16px',
  fontSize: 13.5,
  color: 'var(--text-primary)',
  borderBottom: '1px solid var(--border-hairline-soft)',
};
const iconBtnStyle = {
  background: 'transparent',
  border: '1px solid var(--border-hairline)',
  color: 'var(--text-secondary)',
  borderRadius: 6,
  padding: '5px 10px',
  fontSize: 12,
  cursor: 'pointer',
};
