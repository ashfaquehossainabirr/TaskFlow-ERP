import { useEffect, useState } from 'react';
import PageShell from '../components/PageShell';
import TaskTable from '../components/TaskTable';
import TaskFormModal from '../components/TaskFormModal';
import TaskDetailModal from '../components/TaskDetailModal';
import ConfirmModal from '../components/ConfirmModal';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { STATUS_LABELS } from '../utils/deadline';
import { canManageTasks } from '../utils/roles';
import useDebounce from '../hooks/useDebounce';
import Spinner from '../components/Spinner';

export default function Tasks() {
  const { user } = useAuth();
  const isManager = canManageTasks(user.role);
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [detailTaskId, setDetailTaskId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteTask, setConfirmDeleteTask] = useState(null);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (projectFilter) params.project = projectFilter;
      if (debouncedSearch) params.search = debouncedSearch;
      const res = await api.get('/tasks', {
        params,
      });
      setTasks(res.data);
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = async () => {
    if (!isManager) return;
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
  }, [statusFilter, projectFilter, debouncedSearch]);

  const handleStatusChange = async (task, status) => {
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
      alert(err.response?.data?.message || 'Failed to update status');
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

    setDeletingId(task._id);
    
    try {
      await api.delete(`/tasks/${task._id}`);
      setTasks((ts) => ts.filter((t) => t._id !== task._id));
    } catch (err) {
      const stillExists = await api
        .get(`/tasks/${task._id}`)
        .then(() => true)
        .catch((checkErr) => checkErr.response?.status !== 404);
      if (stillExists) {
        alert(err.response?.data?.message || 'Failed to delete task');
      } else {
        setTasks((ts) => ts.filter((t) => t._id !== task._id));
      }
    } finally {
      setDeletingId(null);
      setConfirmDeleteTask(null);
    }
  };

  return (
    <PageShell
      title={isManager ? 'All Tasks' : 'My Tasks'}
      subtitle={
        isManager
          ? 'Create, assign, and track every task across the team.'
          : 'Update the status of tasks assigned to you.'
      }
      actions={
        isManager && (
          <button
            onClick={() => {
              setEditingTask(null);
              setShowForm(true);
            }}
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
            + New task
          </button>
        )
      }
    >
      <div
        style={{
          display: 'flex',
          gap: 10,
          marginBottom: 20,
          flexWrap: 'wrap',
        }}
      >
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tasks by title…"
          style={{
            background: 'var(--bg-inset)',
            border: '1px solid var(--border-hairline)',
            borderRadius: 8,
            padding: '9px 12px',
            fontSize: 13.5,
            color: 'var(--text-primary)',
            minWidth: 220,
            flex: '1 1 220px',
          }}
        />
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          style={{
            background: 'var(--bg-inset)',
            border: '1px solid var(--border-hairline)',
            borderRadius: 8,
            padding: '9px 12px',
            fontSize: 13.5,
            color: 'var(--text-primary)',
            minWidth: 200,
          }}
        >
          <option value="">All projects</option>
          {projects.map((p) => (
            <option key={p._id} value={p._id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            background: 'var(--bg-inset)',
            border: '1px solid var(--border-hairline)',
            borderRadius: 8,
            padding: '9px 12px',
            fontSize: 13.5,
            color: 'var(--text-primary)',
          }}
        >
          <option value="">All statuses</option>
          {Object.keys(STATUS_LABELS).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div style={{ padding: '48px 0' }}>
          <Spinner label="Loading tasks…" />
        </div>
      ) : (
        <TaskTable
          tasks={tasks}
          isAdmin={isManager}
          onStatusChange={handleStatusChange}
          onEdit={(task) => {
            setEditingTask(task);
            setShowForm(true);
          }}
          onDelete={handleDelete}
          deletingId={deletingId}
          onRowClick={(task) => setDetailTaskId(task._id)}
          emptyLabel="No tasks match your filters."
        />
      )}

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
