import { useEffect, useMemo, useState } from 'react';
import PageShell from '../components/PageShell';
import Spinner from '../components/Spinner';
import api from '../api/axios';
import { ATTENDANCE_STATUS_LABELS, ATTENDANCE_STATUS_COLORS, pillStyle } from '../erp/badges';

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function Attendance() {
  const [date, setDate] = useState(todayStr());
  const [roster, setRoster] = useState([]);
  const [records, setRecords] = useState({}); // employeeId -> record
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [rosterRes, attendanceRes] = await Promise.all([
        api.get('/attendance/roster'),
        api.get('/attendance', { params: { date } }),
      ]);
      setRoster(rosterRes.data);
      const map = {};
      attendanceRes.data.forEach((r) => {
        map[r.employee._id] = r;
      });
      setRecords(map);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const setStatus = (employeeId, status) => {
    setRecords((r) => ({
      ...r,
      [employeeId]: { ...(r[employeeId] || { employee: { _id: employeeId } }), status, _dirty: true },
    }));
  };

  const markAllPresent = () => {
    setRecords((r) => {
      const next = { ...r };
      roster.forEach((emp) => {
        next[emp._id] = { ...(next[emp._id] || { employee: emp }), status: 'present', _dirty: true };
      });
      return next;
    });
  };

  const summary = useMemo(() => {
    const counts = {};
    Object.keys(ATTENDANCE_STATUS_LABELS).forEach((s) => (counts[s] = 0));
    roster.forEach((emp) => {
      const status = records[emp._id]?.status;
      if (status) counts[status] += 1;
    });
    return counts;
  }, [records, roster]);

  const saveAll = async () => {
    setSaving(true);
    setBanner('');
    try {
      const entries = roster
        .filter((emp) => records[emp._id]?.status)
        .map((emp) => ({ employee: emp._id, status: records[emp._id].status }));
      if (entries.length === 0) {
        setBanner('Mark at least one status before saving.');
        setSaving(false);
        return;
      }
      await api.post('/attendance/bulk', { date, entries });
      setBanner('Attendance saved.');
      load();
    } catch (err) {
      setBanner(err.response?.data?.message || 'Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell
      title="Attendance"
      subtitle="Mark daily attendance for your team."
      actions={
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            type="date"
            value={date}
            max={todayStr()}
            onChange={(e) => setDate(e.target.value)}
            style={{
              background: 'var(--bg-inset)',
              border: '1px solid var(--border-hairline)',
              borderRadius: 8,
              padding: '9px 12px',
              fontSize: 13.5,
              color: 'var(--text-primary)',
            }}
          />
          <button onClick={markAllPresent} style={secondaryBtn}>
            Mark all present
          </button>
          <button onClick={saveAll} disabled={saving} style={primaryBtn}>
            {saving ? 'Saving…' : 'Save attendance'}
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12, marginBottom: 20 }}>
        {Object.entries(ATTENDANCE_STATUS_LABELS).map(([key, label]) => (
          <div
            key={key}
            style={{
              background: 'var(--bg-panel)',
              border: '1px solid var(--border-hairline-soft)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
            }}
          >
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
            <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: ATTENDANCE_STATUS_COLORS[key] }}>
              {summary[key]}
            </div>
          </div>
        ))}
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
          <table style={{ width: '100%', minWidth: 640, borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--bg-panel)' }}>
              <tr>
                {['Employee', 'Department', 'Status'].map((h) => (
                  <th key={h} style={thStyle}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={3} style={{ padding: '40px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <Spinner label="Loading roster…" />
                    </div>
                  </td>
                </tr>
              )}
              {!loading && roster.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No team members found.
                  </td>
                </tr>
              )}
              {roster.map((emp) => (
                <tr key={emp._id}>
                  <td style={tdStyle}>{emp.name}</td>
                  <td style={tdStyle}>{emp.department || '—'}</td>
                  <td style={tdStyle}>
                    <select
                      value={records[emp._id]?.status || ''}
                      onChange={(e) => setStatus(emp._id, e.target.value)}
                      style={{
                        background: 'var(--bg-inset)',
                        border: '1px solid var(--border-hairline)',
                        borderRadius: 6,
                        padding: '6px 10px',
                        fontSize: 13,
                        color: records[emp._id]?.status ? ATTENDANCE_STATUS_COLORS[records[emp._id].status] : 'var(--text-secondary)',
                        fontWeight: 600,
                      }}
                    >
                      <option value="">Not marked</option>
                      {Object.entries(ATTENDANCE_STATUS_LABELS).map(([v, l]) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageShell>
  );
}

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
const primaryBtn = {
  background: 'var(--accent-cyan)',
  color: 'var(--text-on-accent)',
  border: 'none',
  borderRadius: 8,
  padding: '9px 16px',
  fontSize: 13.5,
  fontWeight: 700,
  cursor: 'pointer',
};
const secondaryBtn = {
  background: 'transparent',
  color: 'var(--text-secondary)',
  border: '1px solid var(--border-hairline)',
  borderRadius: 8,
  padding: '9px 16px',
  fontSize: 13.5,
  fontWeight: 600,
  cursor: 'pointer',
};
