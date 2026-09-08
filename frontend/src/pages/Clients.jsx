import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageShell from '../components/PageShell';
import ClientFormModal from '../components/ClientFormModal';
import ConfirmModal from '../components/ConfirmModal';
import Spinner from '../components/Spinner';
import api from '../api/axios';
import useDebounce from '../hooks/useDebounce';
import { CLIENT_STATUS_COLORS, pillStyle } from '../erp/badges';

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleteError, setDeleteError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (debouncedSearch) params.search = debouncedSearch;
      const res = await api.get('/clients', { params });
      setClients(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [debouncedSearch]);

  const handleSubmit = async (form, id) => {
    if (id) {
      await api.put(`/clients/${id}`, form);
    } else {
      await api.post('/clients', form);
    }
  };

  const performDelete = async () => {
    setDeleteError('');
    try {
      await api.delete(`/clients/${confirmDelete._id}`);
      setClients((list) => list.filter((c) => c._id !== confirmDelete._id));
      setConfirmDelete(null);
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Failed to delete client');
    }
  };

  return (
    <PageShell
      title="Clients"
      subtitle="Companies and contacts you do business with."
      actions={
        <button
          onClick={() => {
            setEditingClient(null);
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
          + New client
        </button>
      }
    >
      <div style={{ marginBottom: 16 }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, company, email…"
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
          padding: 10,
        }}
      >
        <div style={{ overflowX: 'auto', maxHeight: 560, overflowY: 'auto', paddingRight: 6 }}>
          <table style={{ width: '100%', minWidth: 820, borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--bg-panel)' }}>
              <tr>
                {['Name', 'Company', 'Email', 'Industry', 'Status', ''].map((h) => (
                  <th key={h} style={thStyle}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} style={{ padding: '40px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <Spinner label="Loading clients…" />
                    </div>
                  </td>
                </tr>
              )}
              {!loading && clients.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No clients yet — convert a won lead or add one directly.
                  </td>
                </tr>
              )}
              {clients.map((c) => (
                <tr key={c._id}>
                  <td style={tdStyle}>
                    <Link to={`/clients/${c._id}`} style={{ color: 'var(--text-primary)', fontWeight: 600, textDecoration: 'none' }}>
                      {c.name}
                    </Link>
                  </td>
                  <td style={tdStyle}>{c.company || '—'}</td>
                  <td style={tdStyle} className="mono">
                    {c.email || '—'}
                  </td>
                  <td style={tdStyle}>{c.industry || '—'}</td>
                  <td style={tdStyle}>
                    <span style={pillStyle(CLIENT_STATUS_COLORS[c.status])}>{c.status}</span>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => {
                          setEditingClient(c);
                          setShowForm(true);
                        }}
                        style={iconBtnStyle}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          setDeleteError('');
                          setConfirmDelete(c);
                        }}
                        style={{ ...iconBtnStyle, color: 'var(--status-cancelled)' }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <ClientFormModal
          client={editingClient}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            load();
          }}
          onSubmit={handleSubmit}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Delete client"
          message={deleteError || `Delete ${confirmDelete.name}? This cannot be undone.`}
          confirmLabel="Delete client"
          onConfirm={performDelete}
          onClose={() => setConfirmDelete(null)}
        />
      )}
    </PageShell>
  );
}

const thStyle = {
  textAlign: 'left',
  padding: '10px 16px',
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  borderBottom: '1px solid var(--border-hairline-soft)',
};
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
