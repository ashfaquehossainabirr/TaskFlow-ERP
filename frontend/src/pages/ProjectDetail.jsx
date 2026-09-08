import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import PageShell from '../components/PageShell';
import TaskTable from '../components/TaskTable';
import TaskDetailModal from '../components/TaskDetailModal';
import MilestoneFormModal from '../components/MilestoneFormModal';
import ConfirmModal from '../components/ConfirmModal';
import ProgressBar from '../components/ProgressBar';
import { ProjectStatusBadge, MilestoneStatusBadge } from '../components/ProjectStatusBadge';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';
import api from '../api/axios';

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detailTaskId, setDetailTaskId] = useState(null);
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState(null);
  const [confirmDeleteMilestone, setConfirmDeleteMilestone] = useState(null);
  const [confirmDeleteProject, setConfirmDeleteProject] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');

    try {
      const [projectRes, tasksRes] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get('/tasks', {
          params: {
            project: id,
          },
        }),
      ]);
      setProject(projectRes.data);
      setTasks(tasksRes.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load this project.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

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

  const handleMilestoneSubmit = async (form, milestoneId) => {
    if (milestoneId) {
      await api.put(`/projects/${id}/milestones/${milestoneId}`, form);
    } else {
      await api.post(`/projects/${id}/milestones`, form);
    }
  };

  const handleMilestoneDelete = (milestone) => setConfirmDeleteMilestone(milestone);

  const performMilestoneDelete = async () => {
    const milestone = confirmDeleteMilestone;
    try {
      const res = await api.delete(`/projects/${id}/milestones/${milestone._id}`);
      setProject(res.data);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete milestone');
    } finally {
      setConfirmDeleteMilestone(null);
    }
  };

  const handleDeleteProject = () => setConfirmDeleteProject(true);

  const performDeleteProject = async () => {
    try {
      await api.delete(`/projects/${id}`);
      navigate('/projects');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete project');
    } finally {
      setConfirmDeleteProject(false);
    }
  };

  if (loading) {
    return (
      <PageShell title="Loading project…">
        <div style={{ padding: '48px 0' }}>
          <Spinner label="Loading project…" />
        </div>
      </PageShell>
    );
  }
  if (error || !project) {
    return (
      <PageShell title="Project not found">
        <div
          style={{
            background: 'rgba(239, 100, 97, 0.1)',
            border: '1px solid rgba(239, 100, 97, 0.35)',
            color: 'var(--text-error)',
            padding: '12px 14px',
            borderRadius: 8,
            fontSize: 13.5,
          }}
        >
          {error || 'This project could not be found.'}
        </div>
      </PageShell>
    );
  }

  const sortedMilestones = [...(project.milestones || [])].sort(
    (a, b) => new Date(a.dueDate) - new Date(b.dueDate)
  );

  const completedMilestones = sortedMilestones.filter((m) => m.status === 'completed').length;
  
  const milestonePct =
    sortedMilestones.length > 0 ? Math.round((completedMilestones / sortedMilestones.length) * 100) : 0;
    
  const tasksByMilestone = tasks.reduce((acc, t) => {
    const key = t.milestone || 'unassigned';
    if (!acc[key]) acc[key] = { total: 0, delivered: 0 };
    acc[key].total += 1;
    if (t.status === 'delivered') acc[key].delivered += 1;
    return acc;
  }, {});

  const unassignedTaskCount = tasksByMilestone.unassigned?.total || 0;

  return (
    <PageShell
      title={project.name}
      subtitle={project.client ? `Client: ${project.client}` : undefined}
      actions={
        isAdmin && (
          <button onClick={handleDeleteProject} style={dangerBtn}>
            Delete project
          </button>
        )
      }
    >
      <style>{`
        .pd-milestones-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          margin-bottom: 14px;
          flex-wrap: wrap;
        }
        .pd-progress-row {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 16px;
        }
        .pd-progress-bar-wrap {
          flex: 1;
          max-width: 320px;
        }
        .pd-milestone-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 14px 18px;
          flex-wrap: wrap;
        }
        .pd-milestone-meta {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
          flex-wrap: wrap;
        }
        .pd-milestone-actions {
          display: flex;
          gap: 6px;
        }
        @media (max-width: 640px) {
          .pd-progress-row {
            flex-direction: column;
            align-items: stretch;
            gap: 8px;
          }
          .pd-progress-bar-wrap {
            max-width: none;
          }
        }
        @media (max-width: 480px) {
          .pd-milestone-row {
            padding: 12px 14px;
          }
          .pd-milestone-meta {
            width: 100%;
            justify-content: space-between;
          }
        }
      `}</style>

      <Link
        to="/projects"
        style={{
          fontSize: 13,
          color: 'var(--accent-cyan)',
          fontWeight: 600,
          display: 'inline-block',
          marginBottom: 18,
        }}
      >
        ← All projects
      </Link>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 20,
          flexWrap: 'wrap',
        }}
      >
        <ProjectStatusBadge status={project.status} />
        {project.startDate && (
          <span
            className="mono"
            style={{
              fontSize: 12,
              color: 'var(--text-muted)',
            }}
          >
            Start: {new Date(project.startDate).toLocaleDateString()}
          </span>
        )}
        {project.targetEndDate && (
          <span
            className="mono"
            style={{
              fontSize: 12,
              color: 'var(--text-muted)',
            }}
          >
            Target end: {new Date(project.targetEndDate).toLocaleDateString()}
          </span>
        )}
      </div>

      {project.description && (
        <p
          style={{
            fontSize: 14,
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
            marginBottom: 28,
            maxWidth: 720,
          }}
        >
          {project.description}
        </p>
      )}

      <div className="pd-milestones-header">
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 16,
            fontWeight: 700,
            margin: 0,
          }}
        >
          Milestones
        </h2>
        {isAdmin && (
          <button
            onClick={() => {
              setEditingMilestone(null);
              setShowMilestoneForm(true);
            }}
            style={smallPrimaryBtn}
          >
            + Add milestone
          </button>
        )}
      </div>

      {sortedMilestones.length > 0 && (
        <div className="pd-progress-row">
          <div className="pd-progress-bar-wrap">
            <ProgressBar value={completedMilestones} max={sortedMilestones.length} color="var(--status-delivered)" />
          </div>
          <span
            className="mono"
            style={{
              fontSize: 12.5,
              color: 'var(--text-secondary)',
              whiteSpace: 'nowrap',
            }}
          >
            {completedMilestones} of {sortedMilestones.length} milestones completed ({milestonePct}%)
          </span>
        </div>
      )}

      {sortedMilestones.length === 0 ? (
        <div
          style={{
            border: '1px dashed var(--border-hairline)',
            borderRadius: 'var(--radius-lg)',
            padding: '28px 20px',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: 13.5,
            marginBottom: 32,
          }}
        >
          No milestones yet.
        </div>
      ) : (
        <div
          style={{
            background: 'var(--bg-panel)',
            border: '1px solid var(--border-hairline-soft)',
            borderRadius: 'var(--radius-lg)',
            marginBottom: unassignedTaskCount > 0 ? 10 : 32,
            overflow: 'hidden',
          }}
        >
          {sortedMilestones.map((m, i) => (
            <div
              key={m._id}
              className="pd-milestone-row"
              style={{
                borderBottom:
                  i === sortedMilestones.length - 1 ? 'none' : '1px solid var(--border-hairline-soft)',
              }}
            >
              <div
                style={{
                  minWidth: 0,
                  flex: 1,
                }}
              >
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                  }}
                >
                  {m.title}
                </div>
                {m.description && (
                  <div
                    style={{
                      fontSize: 12.5,
                      color: 'var(--text-muted)',
                      marginTop: 2,
                    }}
                  >
                    {m.description}
                  </div>
                )}
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--text-muted)',
                    marginTop: 4,
                  }}
                >
                  {tasksByMilestone[m._id]?.total
                    ? `${tasksByMilestone[m._id].total} task${tasksByMilestone[m._id].total === 1 ? '' : 's'} · ${tasksByMilestone[m._id].delivered} delivered`
                    : 'No tasks linked'}
                </div>
              </div>
              <div className="pd-milestone-meta">
                <span
                  className="mono"
                  style={{
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                  }}
                >
                  Due {new Date(m.dueDate).toLocaleDateString()}
                </span>
                <MilestoneStatusBadge status={m.status} />
                {isAdmin && (
                  <div className="pd-milestone-actions">
                    <button
                      onClick={() => {
                        setEditingMilestone(m);
                        setShowMilestoneForm(true);
                      }}
                      style={iconBtnStyle}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleMilestoneDelete(m)}
                      style={{
                        ...iconBtnStyle,
                        color: 'var(--status-cancelled)',
                      }}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {sortedMilestones.length > 0 && unassignedTaskCount > 0 && (
        <div
          style={{
            fontSize: 12.5,
            color: 'var(--text-muted)',
            marginBottom: 32,
          }}
        >
          {unassignedTaskCount} task{unassignedTaskCount === 1 ? '' : 's'} not linked to a milestone
        </div>
      )}

      <h2
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 16,
          fontWeight: 700,
          marginBottom: 14,
        }}
      >
        Tasks in this project
      </h2>
      <TaskTable
        tasks={tasks}
        isAdmin={false}
        onStatusChange={handleStatusChange}
        onRowClick={(task) => setDetailTaskId(task._id)}
        emptyLabel="No tasks in this project yet."
      />

      {showMilestoneForm && (
        <MilestoneFormModal
          milestone={editingMilestone}
          onClose={() => setShowMilestoneForm(false)}
          onSaved={() => {
            setShowMilestoneForm(false);
            load();
          }}
          onSubmit={handleMilestoneSubmit}
        />
      )}

      {detailTaskId && <TaskDetailModal taskId={detailTaskId} onClose={() => setDetailTaskId(null)} />}

      {confirmDeleteMilestone && (
        <ConfirmModal
          title="Delete milestone"
          message={`Delete milestone "${confirmDeleteMilestone.title}"? Tasks linked to it will be unlinked.`}
          confirmLabel="Delete milestone"
          onConfirm={performMilestoneDelete}
          onClose={() => setConfirmDeleteMilestone(null)}
        />
      )}

      {confirmDeleteProject && (
        <ConfirmModal
          title="Delete project"
          message={`Delete "${project.name}"? This cannot be undone.`}
          confirmLabel="Delete project"
          onConfirm={performDeleteProject}
          onClose={() => setConfirmDeleteProject(false)}
        />
      )}
    </PageShell>
  );
}
const iconBtnStyle = {
  background: 'transparent',
  border: '1px solid var(--border-hairline)',
  color: 'var(--text-secondary)',
  borderRadius: 6,
  padding: '5px 10px',
  fontSize: 11.5,
  cursor: 'pointer',
};
const smallPrimaryBtn = {
  background: 'var(--accent-cyan)',
  color: 'var(--text-on-accent)',
  border: 'none',
  borderRadius: 8,
  padding: '8px 14px',
  fontSize: 12.5,
  fontWeight: 700,
  cursor: 'pointer',
};
const dangerBtn = {
  background: 'transparent',
  border: '1px solid rgba(239, 100, 97, 0.4)',
  color: 'var(--status-cancelled)',
  borderRadius: 8,
  padding: '10px 16px',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
};
