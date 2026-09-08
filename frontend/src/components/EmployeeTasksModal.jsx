import { useEffect, useState } from 'react';
import Modal from './Modal';
import TaskTable from './TaskTable';
import TaskDetailModal from './TaskDetailModal';
import Spinner from './Spinner';
import api from '../api/axios';

export default function EmployeeTasksModal({ employee, onClose }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detailTaskId, setDetailTaskId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    api
      .get('/tasks', {
        params: {
          assignedTo: employee._id,
        },
      })
      .then((res) => {
        if (!cancelled) setTasks(res.data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.message || 'Failed to load tasks for this employee.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [employee._id]);
  
  return (
    <Modal title={`${employee.name}'s tasks`} onClose={onClose} width={780}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 18,
          flexWrap: 'wrap',
        }}
      >
        <span
          className="mono"
          style={{
            fontSize: 12.5,
            color: 'var(--text-muted)',
          }}
        >
          {employee.email}
        </span>
        {employee.department && (
          <span
            style={{
              fontSize: 11.5,
              color: 'var(--text-secondary)',
              background: 'var(--bg-inset)',
              border: '1px solid var(--border-hairline)',
              borderRadius: 999,
              padding: '2px 9px',
            }}
          >
            {employee.department}
          </span>
        )}
      </div>

      {loading && (
        <div style={{ padding: '32px 0' }}>
          <Spinner label="Loading tasks…" />
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

      {!loading && !error && (
        <TaskTable
          tasks={tasks}
          isAdmin={false}
          onRowClick={(task) => setDetailTaskId(task._id)}
          emptyLabel="This employee has no tasks yet."
        />
      )}

      {detailTaskId && <TaskDetailModal taskId={detailTaskId} onClose={() => setDetailTaskId(null)} />}
    </Modal>
  );
}
