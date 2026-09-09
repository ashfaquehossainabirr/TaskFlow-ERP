import { useEffect, useMemo, useState } from 'react';
import PageShell from '../components/PageShell';
import Spinner from '../components/Spinner';
import api from '../api/axios';
import { ATTENDANCE_STATUS_LABELS, ATTENDANCE_STATUS_COLORS, pillStyle } from '../erp/badges';

const todayStr = () => new Date().toISOString().slice(0, 10);

function dateRange(startStr, endStr) {
  const start = new Date(startStr);
  const end = new Date(endStr);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return [];
  const days = [];
  const cursor = new Date(start);
  // Cap at 62 days so a mistyped range can't trigger thousands of writes.
  let guard = 0;
  while (cursor <= end && guard < 62) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
    guard += 1;
  }
  return days;
}

export default function Attendance() {
  const [date, setDate] = useState(todayStr());
  const [roster, setRoster] = useState([]);
  const [records, setRecords] = useState({}); // employeeId -> record
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [offDayOpen, setOffDayOpen] = useState(false);
  const [offDayStart, setOffDayStart] = useState(todayStr());
  const [offDayEnd, setOffDayEnd] = useState(todayStr());
  const [offDaySelected, setOffDaySelected] = useState(new Set());
  const [offDayNotes, setOffDayNotes] = useState('');
  const [offDaySaving, setOffDaySaving] = useState(false);
  const [offDayBanner, setOffDayBanner] = useState('');

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

  // Debounce the search box so filtering (and the "X of Y match" count)
  // only recomputes ~300ms after the admin stops typing.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

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

  const filteredRoster = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return roster;
    return roster.filter((emp) => {
      const name = (emp.name || '').toLowerCase();
      const email = (emp.email || '').toLowerCase();
      const dept = (emp.department || '').toLowerCase();
      return name.includes(q) || email.includes(q) || dept.includes(q);
    });
  }, [roster, debouncedSearch]);

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

  const toggleOffDayEmployee = (employeeId) => {
    setOffDaySelected((prev) => {
      const next = new Set(prev);
      if (next.has(employeeId)) next.delete(employeeId);
      else next.add(employeeId);
      return next;
    });
  };

  const toggleOffDayAll = () => {
    setOffDaySelected((prev) => {
      const filteredIds = filteredRoster.map((emp) => emp._id);
      const allFilteredSelected = filteredIds.length > 0 && filteredIds.every((id) => prev.has(id));
      if (allFilteredSelected) {
        const next = new Set(prev);
        filteredIds.forEach((id) => next.delete(id));
        return next;
      }
      return new Set([...prev, ...filteredIds]);
    });
  };

  const offDayDates = useMemo(() => dateRange(offDayStart, offDayEnd), [offDayStart, offDayEnd]);

  const saveOffDay = async () => {
    setOffDayBanner('');
    if (offDaySelected.size === 0) {
      setOffDayBanner('Select at least one employee.');
      return;
    }
    if (offDayDates.length === 0) {
      setOffDayBanner('Choose a valid date range (end date on or after the start date).');
      return;
    }
    setOffDaySaving(true);
    try {
      const entries = Array.from(offDaySelected).map((employeeId) => ({ employee: employeeId, status: 'holiday' }));
      await api.post('/attendance/bulk', { dates: offDayDates, entries, notes: offDayNotes });
      setOffDayBanner(
        `Off day set for ${entries.length} employee${entries.length === 1 ? '' : 's'} across ${offDayDates.length} day${
          offDayDates.length === 1 ? '' : 's'
        }.`
      );
      if (offDayDates.includes(date)) load();
    } catch (err) {
      setOffDayBanner(err.response?.data?.message || 'Failed to set off day');
    } finally {
      setOffDaySaving(false);
    }
  };

  return (
    <PageShell
      title="Attendance"
      subtitle="Mark daily attendance for your team."
      actions={
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="date"
            value={date}
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
          <button onClick={() => setOffDayOpen((v) => !v)} style={secondaryBtn}>
            {offDayOpen ? 'Close off day panel' : 'Set off day'}
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

      {offDayOpen && (
        <div
          style={{
            background: 'var(--bg-panel)',
            border: '1px solid var(--border-hairline-soft)',
            borderRadius: 'var(--radius-lg)',
            padding: 18,
            marginBottom: 20,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
            <div>
              <h2 style={{ margin: '0 0 4px', fontFamily: 'var(--font-display)', fontSize: 15.5, fontWeight: 700 }}>Set off day</h2>
              <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-secondary)' }}>
                Mark a holiday/off day for one or more employees. It syncs immediately to their attendance page.
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 14 }}>
            <label style={offDayLabelStyle}>
              Start date
              <input
                type="date"
                value={offDayStart}
                onChange={(e) => {
                  const val = e.target.value;
                  setOffDayStart(val);
                  setOffDayEnd((prevEnd) => (prevEnd < val ? val : prevEnd));
                }}
                style={offDayInputStyle}
              />
            </label>
            <label style={offDayLabelStyle}>
              End date
              <input type="date" value={offDayEnd} min={offDayStart} onChange={(e) => setOffDayEnd(e.target.value)} style={offDayInputStyle} />
            </label>
            <label style={offDayLabelStyle}>
              Reason / notes (optional)
              <input
                type="text"
                value={offDayNotes}
                onChange={(e) => setOffDayNotes(e.target.value)}
                placeholder="e.g. National holiday"
                style={offDayInputStyle}
              />
            </label>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Employees
              </span>
              <button type="button" onClick={toggleOffDayAll} style={{ ...secondaryBtn, padding: '5px 10px', fontSize: 12 }}>
                {filteredRoster.length > 0 && filteredRoster.every((emp) => offDaySelected.has(emp._id)) ? 'Clear all' : 'Select all'}
              </button>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                gap: 8,
                maxHeight: 220,
                overflowY: 'auto',
                background: 'var(--bg-inset)',
                border: '1px solid var(--border-hairline)',
                borderRadius: 8,
                padding: 10,
              }}
            >
              {roster.length === 0 && (
                <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>No team members found.</span>
              )}
              {roster.length > 0 && filteredRoster.length === 0 && (
                <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>No employees match your search.</span>
              )}
              {filteredRoster.map((emp) => (
                <label
                  key={emp._id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 13,
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={offDaySelected.has(emp._id)}
                    onChange={() => toggleOffDayEmployee(emp._id)}
                  />
                  {emp.name}
                </label>
              ))}
            </div>
          </div>

          {offDayBanner && (
            <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: 12 }}>{offDayBanner}</div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button onClick={saveOffDay} disabled={offDaySaving} style={primaryBtn}>
              {offDaySaving ? 'Saving…' : 'Set as off day'}
            </button>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {offDayDates.length > 0
                ? `${offDayDates.length} day${offDayDates.length === 1 ? '' : 's'} · ${offDaySelected.size} employee${
                    offDaySelected.size === 1 ? '' : 's'
                  } selected`
                : 'Pick a valid date range'}
            </span>
          </div>
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
        <div style={{ padding: '4px 6px 12px' }}>
          <div style={{ position: 'relative', maxWidth: 420, width: '100%' }}>
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{
                position: 'absolute',
                left: 11,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
                pointerEvents: 'none',
              }}
            >
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employees by name, department, or email…"
              style={{
                width: '100%',
                background: 'var(--bg-inset)',
                border: '1px solid var(--border-hairline)',
                borderRadius: 8,
                padding: '9px 12px 9px 32px',
                fontSize: 13.5,
                color: 'var(--text-primary)',
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Clear search"
                style={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: 15,
                  lineHeight: 1,
                  cursor: 'pointer',
                  padding: 2,
                }}
              >
                ×
              </button>
            )}
          </div>
          {search && (
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 6, paddingLeft: 2 }}>
              {filteredRoster.length} of {roster.length} employee{roster.length === 1 ? '' : 's'} match
            </div>
          )}
        </div>
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
              {!loading && roster.length > 0 && filteredRoster.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No employees match "{debouncedSearch}".
                  </td>
                </tr>
              )}
              {filteredRoster.map((emp) => (
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
const offDayLabelStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  fontSize: 11.5,
  fontWeight: 700,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};
const offDayInputStyle = {
  background: 'var(--bg-inset)',
  border: '1px solid var(--border-hairline)',
  borderRadius: 8,
  padding: '9px 12px',
  fontSize: 13.5,
  fontWeight: 400,
  textTransform: 'none',
  letterSpacing: 'normal',
  color: 'var(--text-primary)',
};
