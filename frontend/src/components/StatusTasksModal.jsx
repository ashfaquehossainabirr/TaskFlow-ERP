import { useEffect, useState } from 'react';
import Modal from './Modal';
import TaskTable from './TaskTable';
import TaskDetailModal from './TaskDetailModal';
import Spinner from './Spinner';
import api from '../api/axios';

export default function StatusTasksModal({ status, statusLabel, onClose }) {
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
          status,
        },
      })
      .then((res) => {
        if (!cancelled) setTasks(res.data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.message || 'Failed to load tasks for this status.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [status]);
  
  return (
    <Modal title={`${statusLabel} tasks`} onClose={onClose} width={800}>
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
          emptyLabel={`No ${statusLabel.toLowerCase()} tasks right now.`}
        />
      )}

      {detailTaskId && <TaskDetailModal taskId={detailTaskId} onClose={() => setDetailTaskId(null)} />}
    </Modal>
  );
}
