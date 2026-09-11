import { useCallback, useEffect, useState } from 'react';
import api from '../api/axios';
import DeadlineChip from './DeadlineChip';
import { useAuth } from '../context/AuthContext';
import { canManageTasks } from '../utils/roles';

export default function DeadlineNotificationBanner({ onTaskClick }) {
  const { user } = useAuth();
  const isManager = canManageTasks(user?.role);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get('/notifications/deadline-alerts')
      .then((res) => setTasks(res.data))
      .catch(() => setTasks([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const clearAll = () => {
    if (clearing || tasks.length === 0) return;
    setClearing(true);
    api
      .post('/notifications/deadline-alerts/clear')
      .then(() => setTasks([]))
      .catch(() => {})
      .finally(() => setClearing(false));
  };

  if (loading || tasks.length === 0) return null;

  const startOfToday = new Date(new Date().setHours(0, 0, 0, 0));
  const overdueCount = tasks.filter((t) => new Date(t.deadline) < startOfToday).length;

  return (
    <div className="deadline-notif-banner">
      <div className="deadline-notif-head">
        <span className="deadline-notif-icon">
          <BellDotIcon />
        </span>
        <div className="deadline-notif-text">
          <div className="deadline-notif-title">
            {tasks.length} task{tasks.length === 1 ? '' : 's'} {isManager ? 'on your team ' : ''}due within 3 days
          </div>
          <div className="deadline-notif-sub">
            {overdueCount > 0 ? `${overdueCount} already overdue — ` : ''}Review before they slip.
          </div>
        </div>
        <button type="button" className="deadline-notif-clear-btn" onClick={clearAll} disabled={clearing}>
          {clearing ? 'Clearing…' : 'Clear all'}
        </button>
      </div>

      <div className="deadline-notif-list">
        {tasks.slice(0, 4).map((task) => (
          <button
            key={task._id}
            type="button"
            className="deadline-notif-item"
            onClick={() => onTaskClick && onTaskClick(task)}
          >
            <span className="deadline-notif-item-title">{task.title}</span>
            {isManager && task.assignedTo?.name && (
              <span className="deadline-notif-item-assignee">{task.assignedTo.name}</span>
            )}
            <DeadlineChip deadline={task.deadline} status={task.status} />
          </button>
        ))}
      </div>

      <style>{`
        .deadline-notif-banner {
          background: linear-gradient(135deg, var(--chip-urgent-bg), var(--bg-panel));
          border: 1px solid var(--chip-urgent-border);
          border-radius: var(--radius-lg);
          padding: 18px 20px;
          margin-bottom: 24px;
        }
        .deadline-notif-head {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 14px;
        }
        .deadline-notif-icon {
          width: 34px;
          height: 34px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          background: var(--bg-panel);
          border: 1px solid var(--chip-urgent-border);
          color: var(--text-warning);
        }
        .deadline-notif-text {
          flex: 1;
          min-width: 0;
        }
        .deadline-notif-title {
          font-family: var(--font-display);
          font-size: 15px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .deadline-notif-sub {
          font-size: 12.5px;
          color: var(--text-secondary);
          margin-top: 3px;
        }
        .deadline-notif-clear-btn {
          font-size: 12px;
          font-weight: 700;
          color: var(--accent-cyan);
          background: transparent;
          border: none;
          padding: 4px 0;
          flex-shrink: 0;
          white-space: nowrap;
        }
        .deadline-notif-clear-btn:hover:not(:disabled) {
          text-decoration: underline;
        }
        .deadline-notif-clear-btn:disabled {
          opacity: 0.6;
          cursor: default;
        }
        .deadline-notif-list {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 10px;
        }
        .deadline-notif-item {
          display: flex;
          align-items: center;
          gap: 8px;
          text-align: left;
          background: var(--bg-panel);
          border: 1px solid var(--border-hairline-soft);
          border-radius: 10px;
          padding: 9px 12px;
          min-width: 0;
        }
        .deadline-notif-item:hover {
          border-color: var(--chip-urgent-border);
        }
        .deadline-notif-item-title {
          flex: 1;
          min-width: 0;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .deadline-notif-item-assignee {
          font-size: 11px;
          color: var(--text-muted);
          flex-shrink: 0;
          max-width: 90px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        @media (max-width: 640px) {
          .deadline-notif-head {
            flex-wrap: wrap;
          }
          .deadline-notif-clear-btn {
            margin-left: 46px;
          }
        }
        @media (max-width: 480px) {
          .deadline-notif-banner {
            padding: 14px 14px;
          }
          .deadline-notif-item {
            flex-wrap: wrap;
          }
          .deadline-notif-item-title {
            width: 100%;
            white-space: normal;
          }
          .deadline-notif-clear-btn {
            margin-left: 0;
          }
        }
      `}</style>
    </div>
  );
}

function BellDotIcon() {
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
      <circle cx="18.5" cy="4.5" r="3.2" fill="var(--text-error)" stroke="var(--bg-panel)" strokeWidth="1.5" />
    </svg>
  );
}
