import { useEffect, useMemo, useState } from 'react';
import PageShell from '../components/PageShell';
import UserFormModal from '../components/UserFormModal';
import ConfirmModal from '../components/ConfirmModal';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import useDebounce from '../hooks/useDebounce';
import Spinner from '../components/Spinner';

const ROLE_COLORS = {
  admin: 'var(--accent-cyan)',
  manager: 'var(--status-hold)',
  employee: 'var(--text-secondary)',
};

export default function Users() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState(null);
  const debouncedSearch = useDebounce(search, 400);

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (debouncedSearch) params.search = debouncedSearch;
      const res = await api.get('/users', {
        params,
      });
      setUsers(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [debouncedSearch]);

  const managers = useMemo(() => users.filter((u) => u.role === 'manager'), [users]);

  const managerNameById = useMemo(() => {
    const map = {};
    managers.forEach((m) => {
      map[m._id] = m.name;
    });
    return map;
  }, [managers]);

  const handleSubmit = async (form, userId) => {
    if (userId) {
      await api.put(`/users/${userId}`, form);
    } else {
      await api.post('/users', form);
    }
  };

  const canDeleteUser = (target) => {
    if (target.isMainAdmin) return false;
    if (target.role !== 'admin') return true;
    return Boolean(currentUser.isMainAdmin);
  };

  const handleDelete = (u) => setConfirmDeleteUser(u);

  const performDelete = async () => {
    const u = confirmDeleteUser;

    setDeletingId(u._id);

    try {
      await api.delete(`/users/${u._id}`);
      setUsers((list) => list.filter((x) => x._id !== u._id));
    } catch (err) {
      const stillExists = await api
        .get('/users', {
          params: {
            search: u.email,
          },
        })
        .then((res) => res.data.some((x) => x._id === u._id))
        .catch(() => true);
      if (stillExists) {
        alert(err.response?.data?.message || 'Failed to delete user');
      } else {
        setUsers((list) => list.filter((x) => x._id !== u._id));
      }
    } finally {
      setDeletingId(null);
      setConfirmDeleteUser(null);
    }
  };
  
  return (
    <PageShell
      title="Team & Access"
      subtitle="Create admin, manager, and employee accounts, and manage who can log in."
      actions={
        <button
          onClick={() => {
            setEditingUser(null);
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
          + New user
        </button>
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
          placeholder="Search by name or email…"
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

      <div
        style={{
          background: 'var(--bg-panel)',
          border: '1px solid var(--border-hairline-soft)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          padding: '10px',
        }}
      >
        <div
          style={{
            overflowX: 'auto',
            maxHeight: '470px',
            overflowY: 'auto',
            paddingRight: '6px',
          }}
        >
          <table
            style={{
              width: '100%',
              minWidth: 720,
              borderCollapse: 'collapse',
            }}
          >
            <thead
              style={{
                position: 'sticky',
                top: 0,
                zIndex: 1,
                background: 'var(--bg-panel)',
                paddingTop: '6px',
              }}
            >
              <tr>
                {['Name', 'Email', 'Role', 'Reports to', 'Department', 'Status', ''].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: 'left',
                      padding: '10px 16px',
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      borderBottom: '1px solid var(--border-hairline-soft)',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} style={{ padding: '40px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <Spinner label="Loading users…" />
                    </div>
                  </td>
                </tr>
              )}
              {!loading && users.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      padding: '40px 16px',
                      textAlign: 'center',
                      color: 'var(--text-muted)',
                    }}
                  >
                    {search ? 'No users match your search.' : 'No users yet.'}
                  </td>
                </tr>
              )}
              {users.map((u) => (
                <tr key={u._id}>
                  <td style={tdStyle}>{u.name}</td>
                  <td
                    style={{
                      ...tdStyle,
                    }}
                    className="mono"
                  >
                    {u.email}
                  </td>
                  <td style={tdStyle}>
                    <span
                      style={{
                        fontSize: 11.5,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        color: ROLE_COLORS[u.role] || 'var(--text-secondary)',
                      }}
                    >
                      {u.role}
                    </span>
                    {u.isMainAdmin && (
                      <span
                        style={{
                          marginLeft: 6,
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: 'var(--accent-cyan)',
                          color: 'var(--text-on-accent)',
                        }}
                      >
                        MAIN
                      </span>
                    )}
                  </td>
                  <td style={tdStyle}>{u.role === 'employee' ? managerNameById[u.manager] || '—' : '—'}</td>
                  <td style={tdStyle}>{u.department || '—'}</td>
                  <td style={tdStyle}>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: u.isActive ? 'var(--status-delivered)' : 'var(--status-cancelled)',
                      }}
                    >
                      {u.isActive ? 'Active' : 'Deactivated'}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <div
                      style={{
                        display: 'flex',
                        gap: 8,
                      }}
                    >
                      <button
                        onClick={() => {
                          setEditingUser(u);
                          setShowForm(true);
                        }}
                        style={iconBtnStyle}
                      >
                        Edit
                      </button>
                      {canDeleteUser(u) ? (
                        <button
                          onClick={() => handleDelete(u)}
                          disabled={deletingId === u._id}
                          style={{
                            ...iconBtnStyle,
                            color: 'var(--status-cancelled)',
                            opacity: deletingId === u._id ? 0.6 : 1,
                            cursor: deletingId === u._id ? 'default' : 'pointer',
                          }}
                        >
                          {deletingId === u._id ? 'Deleting…' : 'Delete'}
                        </button>
                      ) : (
                        <button
                          disabled
                          title={
                            u.isMainAdmin
                              ? 'The main admin account cannot be deleted'
                              : 'Only the main admin can delete another admin account'
                          }
                          style={{
                            ...iconBtnStyle,
                            opacity: 0.4,
                            cursor: 'not-allowed',
                          }}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <UserFormModal
          user={editingUser}
          managers={managers}
          currentUser={currentUser}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            load();
          }}
          onSubmit={handleSubmit}
        />
      )}

      {confirmDeleteUser && (
        <ConfirmModal
          title="Delete user"
          message={`Delete ${confirmDeleteUser.name}? This cannot be undone.`}
          confirmLabel="Delete user"
          onConfirm={performDelete}
          onClose={() => setConfirmDeleteUser(null)}
        />
      )}
    </PageShell>
  );
}
const tdStyle = {
  padding: '14px 16px',
  fontSize: 13.5,
  color: 'var(--text-primary)',
  borderBottom: '1px solid var(--border-hairline-soft)',
};
const iconBtnStyle = {
  background: 'transparent',
  border: '1px solid var(--border-hairline)',
  color: 'var(--text-secondary)',
  borderRadius: 6,
  padding: '5px 10px',
  fontSize: 12,
  cursor: 'pointer',
};
