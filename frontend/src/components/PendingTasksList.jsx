import { useEffect, useState } from 'react';
import api from '../api/axios';
import StatusBadge from './StatusBadge';
import DeadlineChip from './DeadlineChip';
import Spinner from './Spinner';

const STATUS_COLOR = {
  todo: 'var(--status-todo)',
  'in-progress': 'var(--status-progress)',
  delivered: 'var(--status-delivered)',
  cancelled: 'var(--status-cancelled)',
  hold: 'var(--status-hold)',
};

const PRIORITY_COLOR = {
  low: 'var(--text-muted)',
  medium: 'var(--text-info)',
  high: 'var(--text-warning)',
  urgent: 'var(--text-error)',
};

export default function PendingTasksList({ onTaskClick }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    api
      .get('/tasks')
      .then((res) => {
        if (cancelled) return;
        const pending = res.data.filter((t) => t.status !== 'delivered');
        setTasks(pending);
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.message || 'Failed to load pending tasks.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      className="pending-tasks-panel"
      style={{
        background: 'var(--bg-panel)',
        border: '1px solid var(--border-hairline-soft)',
        borderRadius: 'var(--radius-lg)',
        padding: 22,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        width: '100%',
        height: '100%',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--text-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--status-progress), var(--accent-cyan))',
              boxShadow: '0 0 8px var(--status-progress)',
            }}
          />
          Pending Tasks
        </div>
        {!loading && !error && (
          <span
            className="mono pending-count-pill"
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--text-on-accent)',
              background: 'var(--accent-cyan)',
              padding: '3px 10px',
              borderRadius: 999,
            }}
          >
            {tasks.length} task{tasks.length === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {loading && (
        <div style={{ padding: '24px 0' }}>
          <Spinner />
        </div>
      )}

      {error && (
        <div
          style={{
            background: 'rgba(239, 100, 97, 0.1)',
            border: '1px solid rgba(239, 100, 97, 0.35)',
            color: 'var(--text-error)',
            padding: '10px 12px',
            borderRadius: 8,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {!loading && !error && tasks.length === 0 && (
        <div
          style={{
            border: '1px dashed var(--border-hairline)',
            borderRadius: 'var(--radius-lg)',
            padding: '32px 20px',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: 13.5,
          }}
        >
          No pending tasks — everything's delivered.
        </div>
      )}

      {!loading && !error && tasks.length > 0 && (
        <div
          className="pending-tasks-scroll"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            maxHeight: 235,
            overflowY: 'auto',
            paddingRight: 6,
          }}
        >
          {tasks.map((task) => {
            const statusColor = STATUS_COLOR[task.status] || 'var(--status-todo)';
            return (
              <div
                key={task._id}
                className={onTaskClick ? 'pending-task-row' : 'pending-task-row pending-task-row-static'}
                onClick={() => onTaskClick && onTaskClick(task)}
                style={{
                  '--row-glow': statusColor,
                  cursor: onTaskClick ? 'pointer' : 'default',
                }}
              >
                <span className="pending-task-stripe" />
                <div className="pending-task-main">
                  <div className="pending-task-top">
                    <span
                      className="pendingTaskTitle"
                      style={{
                        color: 'var(--text-primary)',
                      }}
                    >
                      {task.title}
                    </span>
                    <span
                      className="pending-priority-dot"
                      title={`Priority: ${task.priority}`}
                      style={{
                        background: PRIORITY_COLOR[task.priority] || 'var(--text-secondary)',
                      }}
                    />
                  </div>
                  <div className="pending-task-meta">
                    <span
                      className="mono pending-project-chip"
                      style={{
                        color: 'var(--text-secondary)',
                        background: 'var(--bg-panel)',
                        border: '1px solid var(--border-hairline)',
                      }}
                    >
                      {task.project?.name || '—'}
                    </span>
                    <StatusBadge status={task.status} />
                  </div>
                </div>
                <div className="pending-task-deadline">
                  <DeadlineChip deadline={task.deadline} status={task.status} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        .pending-tasks-scroll {
          scrollbar-width: thin;
          scrollbar-color: var(--border-hairline) transparent;
        }
        .pending-task-row {
          position: relative;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 11px 14px 11px 16px;
          border-radius: 12px;
          border: 1px solid var(--border-hairline-soft);
          background: linear-gradient(135deg, var(--bg-inset), var(--bg-panel));
          overflow: hidden;
          flex-shrink: 0;
          transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
        }
        .pending-task-row-static {
          cursor: default;
        }
        .pending-task-stripe {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 4px;
          background: var(--row-glow);
          box-shadow: 0 0 10px var(--row-glow);
        }
        .pending-task-row:not(.pending-task-row-static):hover {
          border-color: var(--row-glow);
          // box-shadow: 0 8px 20px -10px var(--row-glow);
          background: var(--bg-panel-raised);
        }
        .pending-task-row:not(.pending-task-row-static):hover .pendingTaskTitle {
          color: var(--accent-cyan);
        }
        [data-theme='light'] .pending-task-row {
          background: var(--bg-panel);
          border-color: var(--text-info);
        }
        [data-theme='light'] .pending-task-row:not(.pending-task-row-static):hover {
          background: var(--bg-panel);
          border-color: color-mix(in srgb, var(--text-info) 55%, white);
        }
        .pending-task-main {
          min-width: 0;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .pending-task-top {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }
        .pendingTaskTitle {
          font-size: 13.5px;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          transition: color 0.18s ease;
          min-width: 0;
        }
        .pending-priority-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .pending-task-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .pending-project-chip {
          font-size: 11.5px;
          padding: 2px 7px;
          border-radius: 5px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 140px;
        }
        .pending-task-deadline {
          flex-shrink: 0;
        }
        @media (max-width: 1024px) {
          .pending-project-chip {
            max-width: 100px;
          }
        }
        @media (max-width: 480px) {
          .pending-task-row {
            flex-wrap: wrap;
            padding: 12px 14px 12px 16px;
          }
          .pending-task-main {
            width: 100%;
          }
          .pending-task-deadline {
            width: 100%;
          }
          .pending-task-deadline > * {
            width: 100%;
            justify-content: center;
          }
          .pending-project-chip {
            max-width: 120px;
          }
        }
      `}</style>
    </div>
  );
}

