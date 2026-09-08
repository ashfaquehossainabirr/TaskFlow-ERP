import { useEffect, useState } from 'react';
import PageShell from '../components/PageShell';
import TaskFormModal from '../components/TaskFormModal';
import TaskDetailModal from '../components/TaskDetailModal';
import ConfirmModal from '../components/ConfirmModal';
import DeadlineChip from '../components/DeadlineChip';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { STATUS_LABELS, STATUS_ORDER } from '../utils/deadline';
import { canManageTasks } from '../utils/roles';
import Spinner from '../components/Spinner';

const COLUMN_COLORS = {
  todo: 'var(--status-todo)',
  'in-progress': 'var(--status-progress)',
  hold: 'var(--status-hold)',
  delivered: 'var(--status-delivered)',
  cancelled: 'var(--status-cancelled)',
};

export default function KanbanBoard() {
  const { user } = useAuth();
  const isAdmin = canManageTasks(user.role);
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [projectFilter, setProjectFilter] = useState('');
  const [dragTaskId, setDragTaskId] = useState(null);
  const [dragOverStatus, setDragOverStatus] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [detailTaskId, setDetailTaskId] = useState(null);
  const [confirmDeleteTask, setConfirmDeleteTask] = useState(null);
  const loadTasks = async () => {
    setLoading(true);
    try {
      const params = {};
      if (projectFilter) params.project = projectFilter;
      const res = await api.get('/tasks', {
        params,
      });
      setTasks(res.data);
    } finally {
      setLoading(false);
    }
  };
  const loadEmployees = async () => {
    if (!isAdmin) return;
    const res = await api.get('/users', {
      params: {
        role: 'employee',
      },
    });
    setEmployees(res.data);
  };
  const loadProjects = async () => {
    const res = await api.get('/projects');
    setProjects(res.data);
  };
  useEffect(() => {
    loadEmployees();
    loadProjects();
  }, []);
  useEffect(() => {
    loadTasks();
  }, [projectFilter]);
  const handleDropOnColumn = async (status) => {
    setDragOverStatus(null);
    const taskId = dragTaskId;
    setDragTaskId(null);
    if (!taskId) return;
    const task = tasks.find((t) => t._id === taskId);
    if (!task || task.status === status) return;
    const prev = tasks;
    setTasks((ts) =>
      ts.map((t) =>
        t._id === task._id
          ? {
              ...t,
              status,
            }
          : t
      )
    );
    try {
      await api.patch(`/tasks/${task._id}/status`, {
        status,
      });
    } catch (err) {
      setTasks(prev);
      alert(err.response?.data?.message || 'Failed to move task');
    }
  };
  const handleSubmit = async (form, taskId) => {
    if (taskId) {
      await api.put(`/tasks/${taskId}`, form);
    } else {
      await api.post('/tasks', form);
    }
  };
  const handleDelete = (task) => setConfirmDeleteTask(task);
  const performDelete = async () => {
    const task = confirmDeleteTask;
    try {
      await api.delete(`/tasks/${task._id}`);
      setTasks((ts) => ts.filter((t) => t._id !== task._id));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete task');
    } finally {
      setConfirmDeleteTask(null);
    }
  };
  const columns = STATUS_ORDER.map((status) => ({
    status,
    label: STATUS_LABELS[status],
    color: COLUMN_COLORS[status],
    tasks: tasks.filter((t) => t.status === status),
  }));
  
  return (
    <PageShell
      title="Kanban Board"
      subtitle="Drag a card into a different column to change its status."
      actions={
        isAdmin && (
          <button
            onClick={() => {
              setEditingTask(null);
              setShowForm(true);
            }}
            style={primaryBtnStyle}
          >
            + New task
          </button>
        )
      }
    >
      <div
        style={{
          marginBottom: 18,
        }}
      >
        <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} style={selectStyle}>
          <option value="">All projects</option>
          {projects.map((p) => (
            <option key={p._id} value={p._id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div style={{ padding: '48px 0' }}>
          <Spinner label="Loading board…" />
        </div>
      ) : (
        <div className="kanban-scroll">
          {columns.map((col) => (
            <div
              key={col.status}
              className={`kanban-column${dragOverStatus === col.status ? ' kanban-column-hover' : ''}`}
              style={{
                '--col-color': col.color,
              }}
              onDragOver={(e) => {
                e.preventDefault();
                if (dragOverStatus !== col.status) setDragOverStatus(col.status);
              }}
              onDragLeave={() => setDragOverStatus((s) => (s === col.status ? null : s))}
              onDrop={() => handleDropOnColumn(col.status)}
            >
              <div className="kanban-column-header">
                <span className="kanban-dot" />
                <span>{col.label}</span>
                <span className="mono kanban-count">{col.tasks.length}</span>
              </div>

              <div className="kanban-cards">
                {col.tasks.length === 0 && <div className="kanban-empty">No tasks</div>}
                {col.tasks.map((task) => (
                  <div
                    key={task._id}
                    draggable
                    onDragStart={(e) => {
                      setDragTaskId(task._id);
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragEnd={() => setDragTaskId(null)}
                    onClick={() => setDetailTaskId(task._id)}
                    className="kanban-card"
                  >
                    <div className="kanban-card-title">{task.title}</div>
                    <div className="kanban-card-project mono">{task.project?.name || '—'}</div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: 8,
                        gap: 8,
                      }}
                    >
                      <DeadlineChip deadline={task.deadline} status={task.status} />
                      {isAdmin && task.assignedTo?.name && (
                        <span className="kanban-card-assignee">{task.assignedTo.name}</span>
                      )}
                    </div>
                    {isAdmin && (
                      <div className="kanban-card-actions" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            setEditingTask(task);
                            setShowForm(true);
                          }}
                        >
                          Edit
                        </button>
                        <button onClick={() => handleDelete(task)} className="kanban-danger">
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .kanban-scroll {
          display: flex;
          gap: 14px;
          overflow-x: auto;
          padding-bottom: 8px;
        }
        .kanban-column {
          background: var(--bg-panel);
          border: 1px solid var(--border-hairline-soft);
          border-radius: var(--radius-lg);
          width: 260px;
          min-width: 260px;
          display: flex;
          flex-direction: column;
          max-height: calc(100vh - 220px);
          transition: border-color 0.15s ease, background 0.15s ease;
        }
        .kanban-column-hover {
          border-color: var(--col-color);
          background: var(--bg-panel-raised);
        }
        .kanban-column-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 14px 14px 10px;
          font-size: 13px;
          font-weight: 700;
          color: var(--text-primary);
          border-bottom: 1px solid var(--border-hairline-soft);
        }
        .kanban-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--col-color);
          box-shadow: 0 0 8px var(--col-color);
        }
        .kanban-count {
          margin-left: auto;
          font-size: 11.5px;
          color: var(--text-muted);
        }
        .kanban-cards {
          flex: 1;
          overflow-y: auto;
          padding: 10px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .kanban-empty {
          text-align: center;
          font-size: 12px;
          color: var(--text-muted);
          padding: 20px 8px;
          border: 1px dashed var(--border-hairline);
          border-radius: 8px;
        }
        .kanban-card {
          background: var(--bg-inset);
          border: 1px solid var(--border-hairline);
          border-radius: 10px;
          padding: 12px;
          cursor: grab;
          transition: border-color 0.15s ease, transform 0.15s ease, background 0.15s ease;
        }
        .kanban-card:hover {
          border-color: var(--accent-cyan-dim);
        }
        [data-theme='light'] .kanban-card {
          background: var(--bg-panel);
          border-color: var(--border-hairline);
        }
        [data-theme='light'] .kanban-card:hover {
          border-color: var(--accent-cyan);
        }
        .kanban-card:active {
          cursor: grabbing;
        }
        .kanban-card-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
          line-height: 1.35;
        }
        .kanban-card-project {
          font-size: 11px;
          color: var(--text-muted);
          margin-top: 4px;
        }
        .kanban-card-assignee {
          font-size: 11px;
          color: var(--text-secondary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 100px;
        }
        .kanban-card-actions {
          display: flex;
          gap: 6px;
          margin-top: 10px;
          padding-top: 8px;
          border-top: 1px solid var(--border-hairline-soft);
        }
        .kanban-card-actions button {
          background: transparent;
          border: 1px solid var(--border-hairline);
          color: var(--text-secondary);
          border-radius: 6px;
          padding: 4px 8px;
          font-size: 11px;
          cursor: pointer;
        }
        .kanban-danger {
          color: var(--status-cancelled) !important;
        }
      `}</style>

      {showForm && (
        <TaskFormModal
          task={editingTask}
          employees={employees}
          projects={projects}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            loadTasks();
          }}
          onSubmit={handleSubmit}
        />
      )}

      {detailTaskId && <TaskDetailModal taskId={detailTaskId} onClose={() => setDetailTaskId(null)} />}

      {confirmDeleteTask && (
        <ConfirmModal
          title="Delete task"
          message={`Delete "${confirmDeleteTask.title}"? This cannot be undone.`}
          confirmLabel="Delete task"
          onConfirm={performDelete}
          onClose={() => setConfirmDeleteTask(null)}
        />
      )}
    </PageShell>
  );
}
const primaryBtnStyle = {
  background: 'var(--accent-cyan)',
  color: 'var(--text-on-accent)',
  border: 'none',
  borderRadius: 8,
  padding: '10px 18px',
  fontSize: 13.5,
  fontWeight: 700,
  cursor: 'pointer',
};
const selectStyle = {
  background: 'var(--bg-inset)',
  border: '1px solid var(--border-hairline)',
  borderRadius: 8,
  padding: '9px 12px',
  fontSize: 13.5,
  color: 'var(--text-primary)',
  minWidth: 200,
};
