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
  const [offDayQuery, setOffDayQuery] = useState('');
  const [offDaySuggestOpen, setOffDaySuggestOpen] = useState(false);

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

  const offDayDates = useMemo(() => dateRange(offDayStart, offDayEnd), [offDayStart, offDayEnd]);

  // Employees still available to add, matching the off-day search box (or the
  // first handful of the roster when the box is empty), for the dropdown.
  const offDaySuggestions = useMemo(() => {
    const q = offDayQuery.trim().toLowerCase();
    const pool = roster.filter((emp) => !offDaySelected.has(emp._id));
    const matches = q
      ? pool.filter((emp) => {
          const name = (emp.name || '').toLowerCase();
          const email = (emp.email || '').toLowerCase();
          const dept = (emp.department || '').toLowerCase();
          return name.includes(q) || email.includes(q) || dept.includes(q);
        })
      : pool;
    return matches.slice(0, 8);
  }, [roster, offDaySelected, offDayQuery]);

  const selectedOffDayEmployees = useMemo(
    () => Array.from(offDaySelected).map((id) => roster.find((emp) => emp._id === id)).filter(Boolean),
    [offDaySelected, roster]
  );

  const addOffDayEmployee = (employeeId) => {
    setOffDaySelected((prev) => new Set(prev).add(employeeId));
    setOffDayQuery('');
  };

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
        <div className="attendance-actions">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="attendance-date-input"
            style={{
              background: 'var(--bg-inset)',
              border: '1px solid var(--border-hairline)',
              borderRadius: 8,
              padding: '9px 12px',
              fontSize: 13.5,
              color: 'var(--text-primary)',
            }}
          />
          <button onClick={markAllPresent} style={secondaryBtn} className="attendance-action-btn">
            Mark all present
          </button>
          <button onClick={() => setOffDayOpen((v) => !v)} style={secondaryBtn} className="attendance-action-btn">
            {offDayOpen ? 'Close off day panel' : 'Set off day'}
          </button>
          <button onClick={saveAll} disabled={saving} style={primaryBtn} className="attendance-action-btn">
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
          className="off-day-panel"
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

          <div className="off-day-fields" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 14 }}>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Employees {selectedOffDayEmployees.length > 0 ? `(${selectedOffDayEmployees.length} selected)` : ''}
              </span>
              {selectedOffDayEmployees.length > 0 && (
                <button
                  type="button"
                  onClick={() => setOffDaySelected(new Set())}
                  style={{ ...secondaryBtn, padding: '5px 10px', fontSize: 12 }}
                >
                  Clear all
                </button>
              )}
            </div>

            {selectedOffDayEmployees.length > 0 && (
              <div className="off-day-chips">
                {selectedOffDayEmployees.map((emp) => (
                  <span key={emp._id} className="off-day-chip">
                    {emp.name}
                    <button
                      type="button"
                      onClick={() => toggleOffDayEmployee(emp._id)}
                      aria-label={`Remove ${emp.name}`}
                      className="off-day-chip-remove"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="off-day-search">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="off-day-search-icon"
              >
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                value={offDayQuery}
                onChange={(e) => {
                  setOffDayQuery(e.target.value);
                  setOffDaySuggestOpen(true);
                }}
                onFocus={() => setOffDaySuggestOpen(true)}
                onBlur={() => setTimeout(() => setOffDaySuggestOpen(false), 120)}
                placeholder={roster.length === 0 ? 'No team members found' : 'Search employees by name, department, or email…'}
                disabled={roster.length === 0}
                style={{ ...offDayInputStyle, width: '100%', paddingLeft: 32 }}
              />

              {offDaySuggestOpen && (
                <div className="off-day-suggestions">
                  {offDaySuggestions.length === 0 && (
                    <div className="off-day-suggestion-empty">
                      {offDayQuery.trim()
                        ? `No employees match "${offDayQuery.trim()}".`
                        : 'All employees have been added.'}
                    </div>
                  )}
                  {offDaySuggestions.map((emp) => (
                    <button
                      type="button"
                      key={emp._id}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => addOffDayEmployee(emp._id)}
                      className="off-day-suggestion-item"
                    >
                      <span className="off-day-suggestion-name">{emp.name}</span>
                      <span className="off-day-suggestion-meta">{emp.department || emp.email || '—'}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {offDayBanner && (
            <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: 12 }}>{offDayBanner}</div>
          )}

          <div className="off-day-footer" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button onClick={saveOffDay} disabled={offDaySaving} style={primaryBtn} className="attendance-action-btn">
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

      <div className="attendance-summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12, marginBottom: 20 }}>
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
        <div className="attendance-table-scroll" style={{ overflowX: 'auto', maxHeight: 560, overflowY: 'auto', paddingRight: 6 }}>
          <table style={{ width: '100%', minWidth: 560, borderCollapse: 'collapse' }}>
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

      <style>{`
        .attendance-actions {
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
        }
        .off-day-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 10px;
        }
        .off-day-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: var(--bg-inset);
          border: 1px solid var(--border-hairline);
          border-radius: 999px;
          padding: 5px 6px 5px 12px;
          font-size: 12.5px;
          font-weight: 600;
          color: var(--text-primary);
          max-width: 100%;
        }
        .off-day-chip-remove {
          background: transparent;
          border: none;
          color: var(--text-muted);
          font-size: 15px;
          line-height: 1;
          cursor: pointer;
          padding: 2px 4px;
          border-radius: 999px;
        }
        .off-day-chip-remove:hover {
          color: var(--text-primary);
          background: var(--border-hairline);
        }
        .off-day-search {
          position: relative;
          max-width: 420px;
          width: 100%;
        }
        .off-day-search-icon {
          position: absolute;
          left: 11px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
          pointer-events: none;
        }
        .off-day-suggestions {
          position: absolute;
          left: 0;
          right: 0;
          top: calc(100% + 6px);
          z-index: 6;
          background: var(--bg-panel);
          border: 1px solid var(--border-hairline);
          border-radius: 8px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
          max-height: 240px;
          overflow-y: auto;
          padding: 4px;
        }
        .off-day-suggestion-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          width: 100%;
          background: transparent;
          border: none;
          border-radius: 6px;
          padding: 9px 10px;
          font-size: 13px;
          color: var(--text-primary);
          text-align: left;
          cursor: pointer;
        }
        .off-day-suggestion-item:hover,
        .off-day-suggestion-item:focus {
          background: var(--bg-inset);
          outline: none;
        }
        .off-day-suggestion-name {
          font-weight: 600;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .off-day-suggestion-meta {
          font-size: 11.5px;
          color: var(--text-muted);
          flex-shrink: 0;
          max-width: 45%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .off-day-suggestion-empty {
          padding: 10px 12px;
          font-size: 12.5px;
          color: var(--text-muted);
        }

        @media (max-width: 900px) {
          .attendance-summary-grid {
            grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)) !important;
          }
          .off-day-fields {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 640px) {
          .attendance-actions {
            width: 100%;
          }
          .attendance-actions .attendance-date-input,
          .attendance-actions .attendance-action-btn {
            flex: 1 1 auto;
            width: 100%;
          }
          .off-day-panel {
            padding: 14px !important;
          }
          .off-day-footer {
            flex-direction: column;
            align-items: stretch !important;
          }
          .off-day-footer .attendance-action-btn {
            width: 100%;
          }
          .off-day-search {
            max-width: 100%;
          }
          .attendance-summary-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }

        @media (max-width: 480px) {
          .attendance-table-scroll {
            max-height: 480px;
          }
        }
      `}</style>
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
