import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api/axios';

const STATUS_META = {
  absent: {
    label: 'Absent',
    color: 'var(--text-error)',
    bg: 'var(--chip-overdue-bg)',
    border: 'var(--chip-overdue-border)',
  },
  late: {
    label: 'Late',
    color: 'var(--text-warning)',
    bg: 'var(--chip-urgent-bg)',
    border: 'var(--chip-urgent-border)',
  },
  'half-day': {
    label: 'Half Day',
    color: 'var(--text-info)',
    bg: 'var(--chip-soon-bg)',
    border: 'var(--chip-soon-border)',
  },
};

const SEEN_KEY = 'tf-notif-seen-at';
const POLL_MS = 120000;

function relativeDay(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const startOfDay = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate());
  const diff = Math.round((startOfDay(now) - startOfDay(d)) / (24 * 60 * 60 * 1000));
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff > 1) return `${diff} days ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [clearing, setClearing] = useState(false);
  const [seenAt, setSeenAt] = useState(() => {
    try {
      return localStorage.getItem(SEEN_KEY) || '';
    } catch {
      return '';
    }
  });
  const rootRef = useRef(null);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get('/attendance/alerts')
      .then((res) => {
        setAlerts(res.data);
        setError('');
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Failed to load notifications.');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    function onClickOutside(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const clearAll = () => {
    if (clearing || alerts.length === 0) return;
    setClearing(true);
    api
      .post('/attendance/alerts/clear')
      .then(() => setAlerts([]))
      .catch((err) => setError(err.response?.data?.message || 'Failed to clear notifications.'))
      .finally(() => setClearing(false));
  };

  const unreadCount = alerts.filter((a) => !seenAt || new Date(a.updatedAt) > new Date(seenAt)).length;

  const toggleOpen = () => {
    setOpen((prev) => {
      const next = !prev;
      if (next) {
        const now = new Date().toISOString();
        setSeenAt(now);
        try {
          localStorage.setItem(SEEN_KEY, now);
        } catch {
          /* ignore */
        }
      }
      return next;
    });
  };

  return (
    <div className="notif-bell-root" ref={rootRef}>
      <button
        type="button"
        className="notif-bell-btn"
        onClick={toggleOpen}
        aria-label="Attendance notifications"
        aria-expanded={open}
        title="Attendance notifications"
      >
        <BellIcon />
        {unreadCount > 0 && <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>

      {open && (
        <div className="notif-dropdown" role="menu">
          <div className="notif-dropdown-header">
            <span>Attendance Alerts</span>
            <div className="notif-dropdown-header-right">
              {alerts.length > 0 && <span className="notif-dropdown-count">{alerts.length}</span>}
              {alerts.length > 0 && (
                <button type="button" className="notif-clear-btn" onClick={clearAll} disabled={clearing}>
                  {clearing ? 'Clearing…' : 'Clear all'}
                </button>
              )}
            </div>
          </div>

          <div className="notif-dropdown-body">
            {loading && <div className="notif-empty">Loading…</div>}
            {!loading && error && <div className="notif-empty notif-error">{error}</div>}
            {!loading && !error && alerts.length === 0 && (
              <div className="notif-empty">No late, half-day, or absent records recently.</div>
            )}
            {!loading &&
              !error &&
              alerts.map((a) => {
                const meta = STATUS_META[a.status] || STATUS_META.late;
                return (
                  <div key={a._id} className="notif-item">
                    <span className="notif-item-dot" style={{ background: meta.color }} />
                    <div className="notif-item-main">
                      <div className="notif-item-top">
                        <span className="notif-item-name">{a.employee?.name || 'Employee'}</span>
                        <span
                          className="notif-item-status"
                          style={{ color: meta.color, background: meta.bg, border: `1px solid ${meta.border}` }}
                        >
                          {meta.label}
                        </span>
                      </div>
                      <div className="notif-item-sub">
                        {a.employee?.department ? `${a.employee.department} · ` : ''}
                        {relativeDay(a.date)}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      <style>{`
        .notif-bell-root {
          position: relative;
        }
        .notif-bell-btn {
          position: relative;
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-inset);
          border: 1px solid var(--border-hairline);
          border-radius: 8px;
          color: var(--text-secondary);
          padding: 0;
          flex-shrink: 0;
        }
        .notif-bell-btn:hover {
          color: var(--text-primary);
          border-color: var(--accent-cyan);
        }
        .notif-badge {
          position: absolute;
          top: -5px;
          right: -5px;
          min-width: 16px;
          height: 16px;
          padding: 0 4px;
          border-radius: 999px;
          background: var(--text-error);
          color: #fff;
          font-size: 10px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
          box-shadow: 0 0 0 2px var(--bg-panel);
        }
        .notif-dropdown {
          position: absolute;
          top: calc(100% + 10px);
          right: 0;
          width: min(340px, 90vw);
          max-height: 400px;
          background: var(--bg-panel);
          border: 1px solid var(--border-hairline-soft);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-card-hover);
          z-index: 200;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .notif-dropdown-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          border-bottom: 1px solid var(--border-hairline-soft);
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--text-secondary);
        }
        .notif-dropdown-header-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .notif-dropdown-count {
          font-size: 11px;
          font-weight: 700;
          background: var(--bg-inset);
          color: var(--text-secondary);
          border-radius: 999px;
          padding: 2px 8px;
        }
        .notif-clear-btn {
          font-size: 11px;
          font-weight: 700;
          text-transform: none;
          letter-spacing: normal;
          color: var(--accent-cyan);
          background: transparent;
          border: none;
          padding: 2px 0;
        }
        .notif-clear-btn:hover:not(:disabled) {
          text-decoration: underline;
        }
        .notif-clear-btn:disabled {
          opacity: 0.6;
          cursor: default;
        }
        .notif-dropdown-body {
          overflow-y: auto;
          max-height: 340px;
          padding: 6px;
        }
        .notif-empty {
          padding: 26px 12px;
          text-align: center;
          font-size: 13px;
          color: var(--text-muted);
        }
        .notif-error {
          color: var(--text-error);
        }
        .notif-item {
          display: flex;
          gap: 10px;
          padding: 10px;
          border-radius: 10px;
        }
        .notif-item:hover {
          background: var(--bg-inset);
        }
        .notif-item-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          margin-top: 5px;
          flex-shrink: 0;
        }
        .notif-item-main {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .notif-item-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .notif-item-name {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .notif-item-status {
          font-size: 10.5px;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: 5px;
          flex-shrink: 0;
          white-space: nowrap;
        }
        .notif-item-sub {
          font-size: 11.5px;
          color: var(--text-muted);
        }
        @media (max-width: 480px) {
          .notif-dropdown {
            position: fixed;
            top: 62px;
            left: 12px;
            right: 12px;
            width: auto;
          }
        }
      `}</style>
    </div>
  );
}

function BellIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 8.5c0-3.6-2.7-6.5-6-6.5s-6 2.9-6 6.5c0 5.5-2 7-2 7h16s-2-1.5-2-7z" />
      <path d="M10.3 20.5a1.9 1.9 0 0 0 3.4 0" />
    </svg>
  );
}
