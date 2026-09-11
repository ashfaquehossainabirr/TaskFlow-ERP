import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageShell from '../components/PageShell';
import StatsCards from '../components/StatsCards';
import DeadlineNotificationBanner from '../components/DeadlineNotificationBanner';
import TaskCompletionDonut from '../components/TaskCompletionDonut';
import PendingTasksList from '../components/PendingTasksList';
import TaskTable from '../components/TaskTable';
import TaskDetailModal from '../components/TaskDetailModal';
import NoticeBoard from '../components/NoticeBoard';
import StatusTasksModal from '../components/StatusTasksModal';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { canManageTasks } from '../utils/roles';
import { exactMoney, exactBDT } from '../utils/currency';

export default function Overview() {
  const { user } = useAuth();
  const isManager = canManageTasks(user.role);
  const [stats, setStats] = useState(null);
  const [urgentTasks, setUrgentTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailTaskId, setDetailTaskId] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [snapshot, setSnapshot] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [statsRes, deadlineRes] = await Promise.all([
        api.get('/tasks/stats'),
        api.get('/tasks/deadlines/upcoming'),
      ]);
      setStats(statsRes.data);
      setUrgentTasks(deadlineRes.data.slice(0, 5));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    if (isManager) {
      api
        .get('/dashboard/business-snapshot')
        .then((res) => setSnapshot(res.data))
        .catch(() => setSnapshot(null));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  return (
    <PageShell
      title={`Welcome back, ${user.name.split(' ')[0]}`}
      subtitle={
        isManager ? "Here's how the team's work is tracking today." : "Here's what's on your plate today."
      }
    >
      <DeadlineNotificationBanner onTaskClick={(task) => setDetailTaskId(task._id)} />

      <StatsCards
        stats={stats}
        loading={loading}
        onCardClick={(statusKey, statusLabel) =>
          setSelectedStatus({
            key: statusKey,
            label: statusLabel,
          })
        }
      />

      {isManager && snapshot && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, margin: 0 }}>
              Business Snapshot
            </h2>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: 14,
            }}
          >
            <SnapshotCard label="Open leads" value={snapshot.openLeadsCount} to="/leads" isCount />
            <SnapshotCard label="Active clients" value={snapshot.activeClientsCount} to="/clients" isCount />
            {snapshot.financeVisible && (
              <>
                <SnapshotCard label="Outstanding invoices" value={exactMoney(snapshot.outstandingInvoices)} to="/invoices" />
                <SnapshotCard label="Revenue this month" value={exactMoney(snapshot.revenueThisMonth)} to="/invoices" accent="var(--status-delivered)" />
                <SnapshotCard label="Expenses this month" value={exactBDT(snapshot.expensesThisMonth)} to="/expenses" accent="var(--status-cancelled)" />
              </>
            )}
          </div>
        </div>
      )}

      <div className="overview-top-grid">
        <TaskCompletionDonut stats={stats} loading={loading} />
        <div className="pending-tasks-col">
          <PendingTasksList onTaskClick={(task) => setDetailTaskId(task._id)} />
        </div>
      </div>

      <style>{`
        .overview-top-grid {
          display: grid;
          grid-template-columns: minmax(280px, 360px) 1fr;
          gap: 20px;
          align-items: stretch;
          margin-bottom: 28px;
        }
        @media (max-width: 1200px) {
          .overview-top-grid {
            grid-template-columns: minmax(260px, 320px) 1fr;
            gap: 16px;
          }
        }
        @media (max-width: 780px) {
          .overview-top-grid {
            grid-template-columns: 1fr;
          }
        }
        .snapshot-card {
          display: block;
          background: var(--bg-panel);
          border: 1px solid var(--border-hairline-soft);
          border-radius: var(--radius-lg);
          padding: 14px 16px;
          text-decoration: none;
          transition: transform 0.15s ease, border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
        }
        .snapshot-card:hover {
          transform: translateY(-2px);
          border-color: var(--border-hairline);
          background: var(--bg-panel-raised);
          box-shadow: var(--shadow-card-hover);
        }
        [data-theme='light'] .snapshot-card:hover {
          background: var(--bg-panel);
        }
      `}</style>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 14,
        }}
      >
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 16,
            fontWeight: 700,
            margin: 0,
          }}
        >
          Deadline Watch{' '}
          <span
            style={{
              color: 'var(--text-muted)',
              fontWeight: 500,
            }}
          >
            · due in 3 days or less
          </span>
        </h2>
        <Link
          to="/deadlines"
          style={{
            fontSize: 13,
            color: 'var(--accent-cyan)',
            fontWeight: 600,
          }}
        >
          View all →
        </Link>
      </div>

      <div className="deadlines">
        <TaskTable
          tasks={urgentTasks}
          isAdmin={false}
          onRowClick={(task) => setDetailTaskId(task._id)}
          emptyLabel="Nothing urgent right now — all deadlines are more than 3 days out."
        />
      </div>

      <div
        className="notice-board"
        style={{
          marginTop: 28,
        }}
      >
        <NoticeBoard />
      </div>

      {detailTaskId && <TaskDetailModal taskId={detailTaskId} onClose={() => setDetailTaskId(null)} />}

      {selectedStatus && (
        <StatusTasksModal
          status={selectedStatus.key}
          statusLabel={selectedStatus.label}
          onClose={() => setSelectedStatus(null)}
        />
      )}
    </PageShell>
  );
}

function SnapshotCard({ label, value, to, isCount, accent }) {
  return (
    <Link to={to} className="snapshot-card">
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: accent || 'var(--text-primary)' }}>
        {value}
      </div>
    </Link>
  );
}
