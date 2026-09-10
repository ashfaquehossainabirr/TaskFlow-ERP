import { useEffect, useMemo, useState } from 'react';
import PageShell from '../components/PageShell';
import Spinner from '../components/Spinner';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { ATTENDANCE_STATUS_LABELS, ATTENDANCE_STATUS_COLORS, pillStyle } from '../erp/badges';

const ATTENDANCE_STATUS_SHORT = {
  present: 'P',
  absent: 'A',
  'half-day': 'HD',
  leave: 'Lv',
  holiday: 'Hol',
  late: 'Lt',
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAYS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const pad2 = (n) => String(n).padStart(2, '0');
const dateKey = (y, m, d) => `${y}-${pad2(m + 1)}-${pad2(d)}`;

function startOfMonth(view) {
  return new Date(view.year, view.month, 1);
}

export default function MyAttendance() {
  const { user } = useAuth();
  const today = new Date();
  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const monthStr = `${view.year}-${pad2(view.month + 1)}`;
  const isCurrentMonth = view.year === today.getFullYear() && view.month === today.getMonth();
  const todayKey = dateKey(today.getFullYear(), today.getMonth(), today.getDate());
  // Employees can look a few months ahead so off days/holidays admins set in
  // advance are visible, without opening up unlimited future browsing.
  const MAX_FUTURE_MONTHS = 3;
  const monthsAhead = (view.year - today.getFullYear()) * 12 + (view.month - today.getMonth());
  const atMaxFutureMonth = monthsAhead >= MAX_FUTURE_MONTHS;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    api
      .get('/attendance', { params: { employee: user._id, month: monthStr } })
      .then((res) => {
        if (!cancelled) setRecords(res.data);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load your attendance for this month.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthStr, user._id]);

  const recordsByDate = useMemo(() => {
    const map = {};
    records.forEach((r) => {
      map[new Date(r.date).toISOString().slice(0, 10)] = r;
    });
    return map;
  }, [records]);

  const summary = useMemo(() => {
    const counts = {};
    Object.keys(ATTENDANCE_STATUS_LABELS).forEach((s) => (counts[s] = 0));
    records.forEach((r) => {
      if (counts[r.status] !== undefined) counts[r.status] += 1;
    });
    return counts;
  }, [records]);

  const markedDays = records.length;
  const presentRate = markedDays > 0 ? Math.round(((summary.present + summary['half-day'] * 0.5) / markedDays) * 100) : null;

  const calendarCells = useMemo(() => {
    const first = startOfMonth(view);
    const leading = first.getDay();
    const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < leading; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const key = dateKey(view.year, view.month, d);
      cells.push({
        day: d,
        key,
        isToday: key === todayKey,
        isFuture: key > todayKey,
        record: recordsByDate[key] || null,
      });
    }
    return cells;
  }, [view, recordsByDate, todayKey]);

  const monthLabel = startOfMonth(view).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const todayRecord = recordsByDate[todayKey];

  const goPrev = () => {
    setView((v) => {
      const m = v.month - 1;
      return m < 0 ? { year: v.year - 1, month: 11 } : { year: v.year, month: m };
    });
  };
  const goNext = () => {
    if (atMaxFutureMonth) return;
    setView((v) => {
      const m = v.month + 1;
      return m > 11 ? { year: v.year + 1, month: 0 } : { year: v.year, month: m };
    });
  };
  const goToday = () => setView({ year: today.getFullYear(), month: today.getMonth() });

  return (
    <PageShell
      title="My Attendance"
      subtitle="Your day-by-day attendance record."
      actions={
        <div className="ma-month-nav">
          <button type="button" onClick={goPrev} className="ma-nav-btn" aria-label="Previous month">
            ‹
          </button>
          <span className="ma-month-label">{monthLabel}</span>
          <button
            type="button"
            onClick={goNext}
            className="ma-nav-btn"
            aria-label="Next month"
            disabled={atMaxFutureMonth}
            style={atMaxFutureMonth ? { opacity: 0.35, cursor: 'not-allowed' } : undefined}
          >
            ›
          </button>
          {!isCurrentMonth && (
            <button type="button" onClick={goToday} className="ma-today-btn">
              This month
            </button>
          )}
        </div>
      }
    >
      {error && (
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
          {error}
        </div>
      )}

      {/* Today banner */}
      <div className="ma-today-banner">
        <span className="ma-today-label">Today · {today.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</span>
        {todayRecord ? (
          <span style={pillStyle(ATTENDANCE_STATUS_COLORS[todayRecord.status])}>{ATTENDANCE_STATUS_LABELS[todayRecord.status]}</span>
        ) : (
          <span style={{ fontSize: 12.5, color: 'var(--text-muted)', fontWeight: 600 }}>Not marked yet</span>
        )}
      </div>

      {/* Stats grid */}
      <div className="ma-stats-grid">
        {Object.entries(ATTENDANCE_STATUS_LABELS).map(([key, label]) => (
          <div key={key} className="ma-stat-card">
            <div className="ma-stat-label">{label}</div>
            <div className="mono ma-stat-value" style={{ color: ATTENDANCE_STATUS_COLORS[key] }}>
              {loading ? '–' : summary[key]}
            </div>
          </div>
        ))}
        <div className="ma-stat-card">
          <div className="ma-stat-label">Attendance rate</div>
          <div className="mono ma-stat-value" style={{ color: 'var(--accent-cyan)' }}>
            {loading || presentRate === null ? '–' : `${presentRate}%`}
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="ma-calendar-panel">
        <div className="ma-calendar-head">
          <h2 className="ma-calendar-title">Calendar</h2>
          <div className="ma-legend">
            {Object.entries(ATTENDANCE_STATUS_LABELS).map(([key, label]) => (
              <span key={key} className="ma-legend-item">
                <span className="ma-legend-dot" style={{ background: ATTENDANCE_STATUS_COLORS[key] }} />
                {label}
              </span>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '40px 0', display: 'flex', justifyContent: 'center' }}>
            <Spinner label="Loading attendance…" />
          </div>
        ) : (
          <>
            <div className="ma-weekday-row">
              {WEEKDAYS.map((wd, i) => (
                <div key={wd} className="ma-weekday-cell">
                  <span className="ma-weekday-full">{wd}</span>
                  <span className="ma-weekday-short">{WEEKDAYS_SHORT[i]}</span>
                </div>
              ))}
            </div>
            <div className="ma-calendar-grid">
              {calendarCells.map((cell, idx) =>
                cell === null ? (
                  <div key={`blank-${idx}`} className="ma-day-cell ma-day-blank" />
                ) : (
                  <div
                    key={cell.key}
                    className={`ma-day-cell${cell.isToday ? ' ma-day-today' : ''}${cell.isFuture ? ' ma-day-future' : ''}`}
                  >
                    <span className="ma-day-number">{cell.day}</span>
                    {(cell.record || !cell.isFuture) && (
                      <span
                        className="ma-day-status"
                        style={{
                          color: cell.record ? ATTENDANCE_STATUS_COLORS[cell.record.status] : ATTENDANCE_STATUS_COLORS.absent,
                        }}
                        title={cell.record ? ATTENDANCE_STATUS_LABELS[cell.record.status] : ATTENDANCE_STATUS_LABELS.absent}
                      >
                        <span className="ma-day-status-full">
                          {cell.record ? ATTENDANCE_STATUS_LABELS[cell.record.status] : ATTENDANCE_STATUS_LABELS.absent}
                        </span>
                        <span className="ma-day-status-short">
                          {cell.record ? ATTENDANCE_STATUS_SHORT[cell.record.status] : ATTENDANCE_STATUS_SHORT.absent}
                        </span>
                      </span>
                    )}
                  </div>
                )
              )}
            </div>
          </>
        )}
      </div>

      <style>{`
        .ma-month-nav {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .ma-nav-btn {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: var(--bg-inset);
          border: 1px solid var(--border-hairline);
          color: var(--text-primary);
          font-size: 18px;
          line-height: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .ma-nav-btn:hover:not(:disabled) {
          border-color: var(--accent-cyan-dim, var(--border-hairline));
          color: var(--accent-cyan);
        }
        .ma-month-label {
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 14.5px;
          min-width: 128px;
          text-align: center;
          color: var(--text-primary);
        }
        .ma-today-btn {
          background: transparent;
          border: 1px solid var(--border-hairline);
          color: var(--text-secondary);
          border-radius: 8px;
          padding: 7px 12px;
          font-size: 12.5px;
          font-weight: 600;
          cursor: pointer;
        }

        .ma-today-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
          background: var(--bg-panel);
          border: 1px solid var(--border-hairline-soft);
          border-radius: var(--radius-lg);
          padding: 14px 18px;
          margin-bottom: 20px;
        }
        .ma-today-label {
          font-size: 13.5px;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .ma-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
          gap: 12px;
          margin-bottom: 24px;
        }
        .ma-stat-card {
          background: var(--bg-panel);
          border: 1px solid var(--border-hairline-soft);
          border-radius: var(--radius-md);
          padding: 12px 16px;
        }
        .ma-stat-label {
          font-size: 11px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 6px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .ma-stat-value {
          font-size: 20px;
          font-weight: 700;
        }

        .ma-calendar-panel {
          background: var(--bg-panel);
          border: 1px solid var(--border-hairline-soft);
          border-radius: var(--radius-lg);
          padding: 20px;
        }
        .ma-calendar-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 16px;
        }
        .ma-calendar-title {
          font-family: var(--font-display);
          font-size: 16px;
          font-weight: 700;
          margin: 0;
        }
        .ma-legend {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }
        .ma-legend-item {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11.5px;
          color: var(--text-secondary);
          font-weight: 600;
          white-space: nowrap;
        }
        .ma-legend-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .ma-weekday-row {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 6px;
          margin-bottom: 6px;
        }
        .ma-weekday-cell {
          text-align: center;
          font-size: 11px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.04em;
          padding: 4px 0;
        }
        .ma-weekday-short {
          display: none;
        }
        .ma-calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 6px;
        }
        .ma-day-cell {
          position: relative;
          aspect-ratio: 1 / 1;
          border-radius: var(--radius-sm);
          background: var(--bg-inset);
          border: 1px solid var(--border-hairline-soft);
          padding: 6px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .ma-day-blank {
          background: transparent;
          border: none;
        }
        .ma-day-today {
          border-color: var(--accent-cyan);
          box-shadow: 0 0 0 1px var(--accent-cyan);
        }
        .ma-day-future {
          opacity: 0.45;
        }
        .ma-day-number {
          font-size: 12.5px;
          font-weight: 600;
          color: var(--text-primary);
          font-family: var(--font-mono);
        }
        .ma-day-status {
          align-self: center;
          font-size: 9.5px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          text-align: center;
          line-height: 1.2;
          margin-bottom: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
        }
        .ma-day-status-short {
          display: none;
        }

        /* ===== Desktop (large screens, > 1280px): roomy layout ===== */
        @media (min-width: 1281px) {
          .ma-calendar-panel {
            padding: 24px;
          }
          .ma-calendar-grid,
          .ma-weekday-row {
            gap: 8px;
          }
          .ma-day-cell {
            padding: 8px;
          }
          .ma-day-status {
            font-size: 10.5px;
          }
        }

        /* ===== Laptop (900px–1280px) ===== */
        @media (max-width: 1280px) {
          .ma-calendar-panel {
            padding: 18px;
          }
        }
        @media (max-width: 1024px) {
          .ma-calendar-panel {
            padding: 16px;
          }
        }

        /* ===== Tablet (561px–900px): sidebar collapses to top bar here ===== */
        @media (max-width: 900px) {
          .ma-stats-grid {
            grid-template-columns: repeat(auto-fit, minmax(115px, 1fr));
            gap: 10px;
          }
          .ma-stat-card {
            padding: 10px 12px;
          }
          .ma-stat-value {
            font-size: 18px;
          }
          .ma-calendar-grid,
          .ma-weekday-row {
            gap: 5px;
          }
          .ma-day-number {
            font-size: 12px;
          }
          .ma-day-status {
            font-size: 9.5px;
          }
        }
        @media (max-width: 768px) {
          .ma-day-number {
            font-size: 11.5px;
          }
        }

        /* ===== Mobile (401px–560px) ===== */
        @media (max-width: 560px) {
          .ma-today-banner {
            padding: 12px 14px;
          }
          .ma-month-label {
            min-width: 0;
            font-size: 13px;
          }
          .ma-weekday-full {
            display: none;
          }
          .ma-weekday-short {
            display: inline;
          }
          .ma-weekday-cell {
            font-size: 11px;
            padding: 2px 0;
          }
          .ma-calendar-grid,
          .ma-weekday-row {
            gap: 4px;
          }
          .ma-day-cell {
            padding: 4px;
            border-radius: 6px;
            aspect-ratio: auto;
            min-height: 46px;
          }
          .ma-day-number {
            font-size: 10.5px;
          }
          .ma-day-status {
            font-size: 8px;
          }
          .ma-legend {
            gap: 8px;
          }
          .ma-legend-item {
            font-size: 10.5px;
          }
        }

        /* ===== Small mobile (<= 400px) ===== */
        @media (max-width: 400px) {
          .ma-day-cell {
            min-height: 40px;
          }
          .ma-day-number {
            font-size: 9.5px;
          }
          .ma-day-status-full {
            display: none;
          }
          .ma-day-status-short {
            display: inline;
          }
          .ma-day-status {
            font-size: 9px;
          }
          .ma-stats-grid {
            grid-template-columns: repeat(auto-fit, minmax(90px, 1fr));
            gap: 8px;
          }
        }

        /* ===== Extra-small mobile (<= 340px) ===== */
        @media (max-width: 340px) {
          .ma-day-cell {
            min-height: 36px;
            padding: 3px;
          }
          .ma-day-number {
            font-size: 9px;
          }
          .ma-day-status {
            font-size: 8.5px;
          }
        }
      `}</style>
    </PageShell>
  );
}
