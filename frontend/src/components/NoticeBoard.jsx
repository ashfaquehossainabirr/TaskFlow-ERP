import { useEffect, useState } from 'react';
import NoticeFormModal from './NoticeFormModal';
import ConfirmModal from './ConfirmModal';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { canManageTasks } from '../utils/roles';
import Spinner from './Spinner';

const PRIORITY_STYLES = {
  normal: {
    label: 'Normal',
    color: 'var(--text-secondary)',
    bg: 'var(--bg-inset)',
    border: 'var(--border-hairline)',
  },
  important: {
    label: 'Important',
    color: 'var(--status-hold)',
    bg: 'rgba(240, 168, 63, 0.1)',
    border: 'rgba(240, 168, 63, 0.3)',
  },
  urgent: {
    label: 'Urgent',
    color: 'var(--status-cancelled)',
    bg: 'rgba(239, 100, 97, 0.1)',
    border: 'rgba(239, 100, 97, 0.35)',
  },
};

export default function NoticeBoard() {
  const { user } = useAuth();
  const canPost = canManageTasks(user.role);
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [confirmDeleteNotice, setConfirmDeleteNotice] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/notices');
      setNotices(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load notices.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (form) => {
    await api.post('/notices', form);
  };

  const handleDelete = (notice) => setConfirmDeleteNotice(notice);

  const performDelete = async () => {
    const notice = confirmDeleteNotice;
    const prev = notices;
    setNotices((list) => list.filter((n) => n._id !== notice._id));
    try {
      await api.delete(`/notices/${notice._id}`);
    } catch (err) {
      setNotices(prev);
      alert(err.response?.data?.message || 'Failed to delete notice.');
    } finally {
      setConfirmDeleteNotice(null);
    }
  };

  const canDelete = (notice) => user.role === 'admin' || String(notice.createdBy?._id) === String(user._id);
  
  return (
    <div
      style={{
        background: 'var(--bg-panel)',
        border: '1px solid var(--border-hairline-soft)',
        borderRadius: 'var(--radius-lg)',
        padding: '18px 20px',
        marginBottom: 28,
      }}
    >
      <div className="notice-board-header">
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 16,
            fontWeight: 700,
            margin: 0,
          }}
        >
          Notice Board
        </h2>
        {canPost && (
          <button
            onClick={() => setShowForm(true)}
            style={{
              background: 'var(--accent-cyan)',
              color: 'var(--text-on-accent)',
              border: 'none',
              borderRadius: 8,
              padding: '7px 14px',
              fontSize: 12.5,
              fontWeight: 700,
            }}
          >
            + New notice
          </button>
        )}
      </div>

      {loading && (
        <div style={{ padding: '24px 0' }}>
          <Spinner label="Loading notices…" />
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
            marginTop: 12,
          }}
        >
          {error}
        </div>
      )}

      {!loading && !error && notices.length === 0 && (
        <div
          style={{
            color: 'var(--text-muted)',
            fontSize: 13.5,
            marginTop: 12,
          }}
        >
          No notices posted yet.
        </div>
      )}

      {!loading && !error && notices.length > 0 && (
        <div
          className="notice-list"
          style={{
            maxHeight: '410px',
            overflowY: 'auto',
            paddingRight: '6px',
          }}
        >
          {notices.map((n) => {
            const style = PRIORITY_STYLES[n.priority] || PRIORITY_STYLES.normal;
            return (
              <div
                key={n._id}
                className="notice-card"
                style={{
                  background: 'var(--bg-inset)',
                  border: `1px solid ${style.border}`,
                  borderRadius: 10,
                  padding: '12px 14px',
                }}
              >
                <div className="notice-card-top">
                  <div className="notice-card-title-row">
                    {n.pinned && (
                      <span
                        title="Pinned"
                        style={{
                          fontSize: 12,
                          color: 'var(--accent-cyan)',
                        }}
                      >
                        📌
                      </span>
                    )}
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                      }}
                    >
                      {n.title}
                    </span>
                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        color: style.color,
                        background: style.bg,
                        border: `1px solid ${style.border}`,
                        borderRadius: 999,
                        padding: '2px 8px',
                        flexShrink: 0,
                      }}
                    >
                      {style.label}
                    </span>
                  </div>
                  {canDelete(n) && (
                    <button
                      onClick={() => handleDelete(n)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-error)',
                        fontSize: 11.5,
                        fontWeight: 600,
                        flexShrink: 0,
                      }}
                    >
                      Delete
                    </button>
                  )}
                </div>

                <p
                  style={{
                    fontSize: 13,
                    color: 'var(--text-secondary)',
                    lineHeight: 1.55,
                    margin: '6px 0 8px',
                    wordBreak: 'break-word',
                  }}
                >
                  {n.message}
                </p>

                <div
                  style={{
                    fontSize: 11.5,
                    color: 'var(--text-muted)',
                  }}
                >
                  {n.createdBy?.name || 'Someone'}
                  {n.createdBy?.role ? ` · ${n.createdBy.role}` : ''} ·{' '}
                  <span className="mono">{new Date(n.createdAt).toLocaleString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <NoticeFormModal
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            load();
          }}
          onSubmit={handleSubmit}
        />
      )}

      {confirmDeleteNotice && (
        <ConfirmModal
          title="Delete notice"
          message={`Delete the notice "${confirmDeleteNotice.title}"?`}
          confirmLabel="Delete notice"
          onConfirm={performDelete}
          onClose={() => setConfirmDeleteNotice(null)}
        />
      )}

      <style>{`
        .notice-board-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .notice-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 14px;
          max-height: 380px;
          overflow-y: auto;
          padding-right: 4px;
        }
        .notice-card-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 10px;
          flex-wrap: wrap;
        }
        .notice-card-title-row {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          min-width: 0;
        }
        @media (max-width: 480px) {
          .notice-list {
            max-height: 320px;
          }
        }
      `}</style>
    </div>
  );
}
