import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageShell from '../components/PageShell';
import TaskDetailModal from '../components/TaskDetailModal';
import Spinner from '../components/Spinner';
import api from '../api/axios';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const STATUS_COLORS = {
  todo: 'var(--status-todo)',
  'in-progress': 'var(--status-progress)',
  hold: 'var(--status-hold)',
  delivered: 'var(--status-delivered)',
  cancelled: 'var(--status-cancelled)',
};

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date, n) {
  return new Date(date.getFullYear(), date.getMonth() + n, 1);
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function buildCalendarDays(monthDate) {
  const first = startOfMonth(monthDate);
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - first.getDay());
  const days = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    days.push(d);
  }
  return days;
}

export default function CalendarView() {
  const navigate = useNavigate();
  const today = useMemo(() => new Date(), []);
  const [month, setMonth] = useState(startOfMonth(today));
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailTaskId, setDetailTaskId] = useState(null);
  const [dayModal, setDayModal] = useState(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([api.get('/tasks'), api.get('/projects')])
      .then(([tRes, pRes]) => {
        setTasks(tRes.data);
        setProjects(pRes.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const milestoneEvents = useMemo(() => {
    const events = [];
    projects.forEach((p) => {
      (p.milestones || []).forEach((m) => {
        if (!m.dueDate) return;
        events.push({
          type: 'milestone',
          date: new Date(m.dueDate),
          title: m.title,
          projectId: p._id,
          projectName: p.name,
          status: m.status,
        });
      });
    });
    return events;
  }, [projects]);

  const taskEvents = useMemo(
    () =>
      tasks
        .filter((t) => t.deadline)
        .map((t) => ({
          type: 'task',
          date: new Date(t.deadline),
          title: t.title,
          id: t._id,
          status: t.status,
        })),
    [tasks]
  );

  const days = useMemo(() => buildCalendarDays(month), [month]);

  const eventsForDay = (day) => [
    ...taskEvents.filter((e) => sameDay(e.date, day)),
    ...milestoneEvents.filter((e) => sameDay(e.date, day)),
  ];
  
  return (
    <PageShell title="Calendar" subtitle="Task deadlines and project milestones, by day.">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 18,
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: 6,
          }}
        >
          <button onClick={() => setMonth((m) => addMonths(m, -1))} style={navBtnStyle}>
            ←
          </button>
          <button onClick={() => setMonth(startOfMonth(today))} style={navBtnStyle}>
            Today
          </button>
          <button onClick={() => setMonth((m) => addMonths(m, 1))} style={navBtnStyle}>
            →
          </button>
        </div>
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 16,
            fontWeight: 700,
          }}
        >
          {month.toLocaleDateString(undefined, {
            month: 'long',
            year: 'numeric',
          })}
        </span>
        <div
          style={{
            display: 'flex',
            gap: 14,
            marginLeft: 'auto',
            fontSize: 11.5,
            color: 'var(--text-muted)',
          }}
        >
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: 2,
                background: 'var(--status-progress)',
              }}
            />
            Task deadline
          </span>
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: 'var(--accent-cyan)',
              }}
            />
            Milestone
          </span>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '48px 0' }}>
          <Spinner label="Loading calendar…" />
        </div>
      ) : (
        <div className="cal-grid">
          {WEEKDAYS.map((w) => (
            <div key={w} className="cal-weekday">
              {w}
            </div>
          ))}
          {days.map((day, i) => {
            const inMonth = day.getMonth() === month.getMonth();
            const isToday = sameDay(day, today);
            const events = eventsForDay(day);
            const visible = events.slice(0, 3);
            const overflow = events.length - visible.length;
            return (
              <div
                key={i}
                className={`cal-day${inMonth ? '' : ' cal-day-outside'}${isToday ? ' cal-day-today' : ''}`}
              >
                <div className="cal-day-number">{day.getDate()}</div>
                <div className="cal-day-events">
                  {visible.map((e, idx) =>
                    e.type === 'task' ? (
                      <button
                        key={`t-${e.id}`}
                        className="cal-event cal-event-task"
                        style={{
                          '--evt-color': STATUS_COLORS[e.status],
                        }}
                        onClick={() => setDetailTaskId(e.id)}
                        title={e.title}
                      >
                        {e.title}
                      </button>
                    ) : (
                      <button
                        key={`m-${e.projectId}-${idx}`}
                        className="cal-event cal-event-milestone"
                        onClick={() => navigate(`/projects/${e.projectId}`)}
                        title={`${e.title} (${e.projectName})`}
                      >
                        🏁 {e.title}
                      </button>
                    )
                  )}
                  {overflow > 0 && (
                    <button
                      className="cal-more"
                      onClick={() =>
                        setDayModal({
                          day,
                          events,
                        })
                      }
                    >
                      +{overflow} more
                    </button>
                  )}
                </div>
                {events.length > 0 && (
                  <button
                    className="cal-day-summary"
                    onClick={() =>
                      setDayModal({
                        day,
                        events,
                      })
                    }
                    aria-label={`${events.length} event${events.length === 1 ? '' : 's'} on ${day.getDate()}`}
                  >
                    <span className="cal-day-summary-dot" />
                    {events.length}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        .cal-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 1px;
          background: var(--border-hairline-soft);
          border: 1px solid var(--border-hairline-soft);
          border-radius: var(--radius-lg);
          overflow: hidden;
        }
        .cal-weekday {
          background: var(--bg-panel);
          padding: 10px 8px;
          font-size: 11px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.04em;
          text-align: center;
        }
        .cal-day {
          background: var(--bg-panel);
          min-height: 96px;
          padding: 8px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .cal-day-outside {
          background: var(--bg-inset);
        }
        .cal-day-outside .cal-day-number {
          color: var(--text-muted);
        }
        .cal-day-today .cal-day-number {
          background: var(--accent-cyan);
          color: var(--text-on-accent);
          border-radius: 6px;
          width: 22px;
          height: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .cal-day-number {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
        }
        .cal-day-events {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .cal-event {
          text-align: left;
          background: var(--bg-inset);
          border: none;
          border-left: 3px solid var(--evt-color, var(--accent-cyan));
          border-radius: 4px;
          padding: 3px 6px;
          font-size: 10.5px;
          color: var(--text-primary);
          cursor: pointer;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .cal-event-milestone {
          border-left-color: var(--accent-cyan);
        }
        .cal-more {
          background: transparent;
          border: none;
          color: var(--text-muted);
          font-size: 10.5px;
          text-align: left;
          cursor: pointer;
          padding: 2px 6px;
        }
        .cal-day-summary {
          display: none;
        }
        @media (max-width: 720px) {
          .cal-grid { grid-template-columns: repeat(7, minmax(38px, 1fr)); }
          .cal-day { min-height: 56px; padding: 4px 2px; gap: 3px; }
          .cal-day-events { display: none; }
          .cal-weekday { padding: 8px 2px; font-size: 9.5px; }
          .cal-day-summary {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 3px;
            background: transparent;
            border: none;
            color: var(--text-secondary);
            font-size: 10px;
            font-weight: 600;
            cursor: pointer;
            padding: 1px 0;
            font-family: var(--font-mono);
          }
          .cal-day-summary-dot {
            width: 5px;
            height: 5px;
            border-radius: 50%;
            background: var(--accent-cyan);
            flex-shrink: 0;
          }
        }
        @media (max-width: 420px) {
          .cal-day { min-height: 46px; }
          .cal-day-number { font-size: 11px; }
        }
        @keyframes cal-modal-overlay-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes cal-modal-box-in {
          from {
            opacity: 0;
            transform: translateY(18px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .cal-day-modal-overlay {
          animation: cal-modal-overlay-in 0.2s ease both;
        }
        .cal-day-modal-box {
          animation: cal-modal-box-in 0.28s cubic-bezier(0.2, 0.7, 0.3, 1) both;
        }
        @media (prefers-reduced-motion: reduce) {
          .cal-day-modal-overlay,
          .cal-day-modal-box {
            animation-duration: 0.001ms !important;
          }
        }
      `}</style>

      {dayModal && (
        <div
          onClick={() => setDayModal(null)}
          className="cal-day-modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(6,9,13,0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="cal-day-modal-box"
            style={{
              background: 'var(--bg-panel-raised)',
              border: '1px solid var(--border-hairline)',
              borderRadius: 'var(--radius-lg)',
              padding: 20,
              width: '100%',
              maxWidth: 340,
            }}
          >
            <div
              style={{
                fontWeight: 700,
                marginBottom: 12,
              }}
            >
              {dayModal.day.toLocaleDateString(undefined, {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
              })}
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              {dayModal.events.map((e, idx) =>
                e.type === 'task' ? (
                  <button
                    key={`t-${e.id}`}
                    className="cal-event cal-event-task"
                    style={{
                      '--evt-color': STATUS_COLORS[e.status],
                      padding: '8px 10px',
                      fontSize: 12.5,
                    }}
                    onClick={() => {
                      setDayModal(null);
                      setDetailTaskId(e.id);
                    }}
                  >
                    {e.title}
                  </button>
                ) : (
                  <button
                    key={`m-${idx}`}
                    className="cal-event cal-event-milestone"
                    style={{
                      padding: '8px 10px',
                      fontSize: 12.5,
                    }}
                    onClick={() => {
                      setDayModal(null);
                      navigate(`/projects/${e.projectId}`);
                    }}
                  >
                    🏁 {e.title}
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {detailTaskId && <TaskDetailModal taskId={detailTaskId} onClose={() => setDetailTaskId(null)} />}
    </PageShell>
  );
}
const navBtnStyle = {
  background: 'var(--bg-inset)',
  border: '1px solid var(--border-hairline)',
  color: 'var(--text-secondary)',
  borderRadius: 8,
  padding: '7px 12px',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
};
