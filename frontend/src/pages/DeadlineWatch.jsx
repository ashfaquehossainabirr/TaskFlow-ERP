import { useEffect, useState } from 'react';
import PageShell from '../components/PageShell';
import TaskTable from '../components/TaskTable';
import TaskDetailModal from '../components/TaskDetailModal';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { canManageTasks } from '../utils/roles';
import Spinner from '../components/Spinner';

export default function DeadlineWatch() {
  const { user } = useAuth();
  const isAdmin = canManageTasks(user.role);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailTaskId, setDetailTaskId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/tasks/deadlines/upcoming');
      setTasks(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

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
      if (status === 'delivered' || status === 'cancelled') {
        setTasks((ts) => ts.filter((t) => t._id !== task._id));
      }
    } catch (err) {
      setTasks(prev);
      alert(err.response?.data?.message || 'Failed to update status');
    }
  };
  
  return (
    <PageShell title="Deadline Watch" subtitle="Every open task due in 3 days or less, soonest first.">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 16px',
          background: 'rgba(240, 168, 63, 0.08)',
          border: '1px solid rgba(240, 168, 63, 0.25)',
          borderRadius: 10,
          marginBottom: 22,
          fontSize: 13.5,
          color: 'var(--text-warning)',
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: 'var(--text-warning)',
            flexShrink: 0,
          }}
        />
        {loading
          ? 'Checking deadlines…'
          : `${tasks.length} task${tasks.length === 1 ? '' : 's'} ${isAdmin ? 'across the team' : 'assigned to you'} need attention.`}
      </div>

      {loading ? (
        <div style={{ padding: '48px 0' }}>
          <Spinner label="Loading tasks…" />
        </div>
      ) : (
        <TaskTable
          tasks={tasks}
          isAdmin={isAdmin}
          showActions={false}
          onStatusChange={handleStatusChange}
          onRowClick={(task) => setDetailTaskId(task._id)}
          emptyLabel="Nothing due within 3 days. You're clear."
        />
      )}

      {detailTaskId && <TaskDetailModal taskId={detailTaskId} onClose={() => setDetailTaskId(null)} />}
    </PageShell>
  );
}
