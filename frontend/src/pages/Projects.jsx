import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageShell from '../components/PageShell';
import ProjectFormModal from '../components/ProjectFormModal';
import ConfirmModal from '../components/ConfirmModal';
import { ProjectStatusBadge } from '../components/ProjectStatusBadge';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import useDebounce from '../hooks/useDebounce';
import Spinner from '../components/Spinner';

export default function Projects() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user.role === 'admin';
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [search, setSearch] = useState('');
  const [confirmDeleteProject, setConfirmDeleteProject] = useState(null);
  const debouncedSearch = useDebounce(search, 400);

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (debouncedSearch) params.search = debouncedSearch;
      const res = await api.get('/projects', {
        params,
      });
      setProjects(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [debouncedSearch]);

  const handleSubmit = async (form, projectId) => {
    if (projectId) {
      await api.put(`/projects/${projectId}`, form);
    } else {
      await api.post('/projects', form);
    }
  };

  const handleDelete = (project) => setConfirmDeleteProject(project);

  const performDelete = async () => {
    const project = confirmDeleteProject;
    try {
      await api.delete(`/projects/${project._id}`);
      setProjects((list) => list.filter((p) => p._id !== project._id));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete project');
    } finally {
      setConfirmDeleteProject(null);
    }
  };
  
  return (
    <PageShell
      title="Projects"
      subtitle="Every project and its milestones, in one place."
      actions={
        isAdmin && (
          <button
            onClick={() => {
              setEditingProject(null);
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
            + New project
          </button>
        )
      }
    >
      <div
        style={{
          marginBottom: 16,
        }}
      >
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search projects by name…"
          style={{
            background: 'var(--bg-inset)',
            border: '1px solid var(--border-hairline)',
            borderRadius: 8,
            padding: '9px 12px',
            fontSize: 13.5,
            color: 'var(--text-primary)',
            minWidth: 260,
          }}
        />
      </div>

      {loading && (
        <div style={{ padding: '48px 0' }}>
          <Spinner label="Loading projects…" />
        </div>
      )}

      {!loading && projects.length === 0 && (
        <div
          style={{
            border: '1px dashed var(--border-hairline)',
            borderRadius: 'var(--radius-lg)',
            padding: '48px 24px',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: 14,
          }}
        >
          {search ? (
            'No projects match your search.'
          ) : (
            <>No projects yet.{isAdmin ? ' Create one to start assigning tasks.' : ''}</>
          )}
        </div>
      )}

      {!loading && projects.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 16,
          }}
        >
          {projects.map((p) => (
            <div key={p._id} onClick={() => navigate(`/projects/${p._id}`)} className="project-card">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: 10,
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 15.5,
                    color: 'var(--text-primary)',
                    minWidth: 0,
                  }}
                >
                  {p.name}
                </div>
                {isAdmin && (
                  <div
                    style={{
                      display: 'flex',
                      gap: 6,
                      flexShrink: 0,
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => {
                        setEditingProject(p);
                        setShowForm(true);
                      }}
                      style={iconBtnStyle}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(p)}
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

              <ProjectStatusBadge status={p.status} />

              {p.description && (
                <p
                  style={{
                    fontSize: 12.5,
                    color: 'var(--text-secondary)',
                    margin: 0,
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {p.description}
                </p>
              )}

              <div
                style={{
                  display: 'flex',
                  gap: 14,
                  marginTop: 4,
                  paddingTop: 10,
                  borderTop: '1px solid var(--border-hairline-soft)',
                  fontSize: 12,
                  color: 'var(--text-muted)',
                }}
              >
                <span className="mono">
                  {p.milestones?.length || 0} milestone{p.milestones?.length === 1 ? '' : 's'}
                </span>
                {p.client && <span>{p.client}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .project-card {
          transition: background 0.2s ease, border-color 0.2s ease, transform 0.15s ease, box-shadow 0.15s ease;
        }
        .project-card:hover {
          background: var(--bg-panel-raised);
          border-color: var(--border-hairline);
        }
        [data-theme='light'] .project-card:hover {
          background: var(--bg-panel);
          border-color: var(--border-hairline);
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
        }
      `}</style>

      {showForm && (
        <ProjectFormModal
          project={editingProject}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            load();
          }}
          onSubmit={handleSubmit}
        />
      )}

      {confirmDeleteProject && (
        <ConfirmModal
          title="Delete project"
          message={`Delete "${confirmDeleteProject.name}"? This cannot be undone.`}
          confirmLabel="Delete project"
          onConfirm={performDelete}
          onClose={() => setConfirmDeleteProject(null)}
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
