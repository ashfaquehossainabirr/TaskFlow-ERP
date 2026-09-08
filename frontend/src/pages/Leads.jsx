import { useEffect, useMemo, useState } from 'react';
import PageShell from '../components/PageShell';
import LeadFormModal from '../components/LeadFormModal';
import ConfirmModal from '../components/ConfirmModal';
import Spinner from '../components/Spinner';
import api from '../api/axios';
import useDebounce from '../hooks/useDebounce';
import { exactMoney } from '../utils/currency';
import { LEAD_STATUS_LABELS, LEAD_STATUS_COLORS, LEAD_SOURCE_LABELS, pillStyle } from '../erp/badges';

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const debouncedSearch = useDebounce(search, 350);
  const [showForm, setShowForm] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [convertingId, setConvertingId] = useState(null);
  const [banner, setBanner] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (debouncedSearch) params.search = debouncedSearch;
      if (statusFilter) params.status = statusFilter;
      const [leadsRes, rosterRes] = await Promise.all([
        api.get('/leads', { params }),
        api.get('/attendance/roster'),
      ]);
      setLeads(leadsRes.data);
      setTeamMembers(rosterRes.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [debouncedSearch, statusFilter]);

  const pipelineValue = useMemo(
    () => leads.filter((l) => !['won', 'lost'].includes(l.status)).reduce((sum, l) => sum + (l.estimatedValue || 0), 0),
    [leads]
  );

  const handleSubmit = async (form, id) => {
    if (id) {
      await api.put(`/leads/${id}`, form);
    } else {
      await api.post('/leads', form);
    }
  };

  const handleConvert = async (lead) => {
    setConvertingId(lead._id);
    try {
      await api.post(`/leads/${lead._id}/convert`);
      setBanner(`${lead.name} was converted to a client.`);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to convert lead');
    } finally {
      setConvertingId(null);
    }
  };

  const performDelete = async () => {
    await api.delete(`/leads/${confirmDelete._id}`);
    setLeads((list) => list.filter((l) => l._id !== confirmDelete._id));
    setConfirmDelete(null);
  };

  return (
    <PageShell
      title="Leads"
      subtitle={`Sales pipeline — ${exactMoney(pipelineValue)} in open opportunities.`}
      actions={
        <button
          onClick={() => {
            setEditingLead(null);
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
          + New lead
        </button>
      }
    >
      {banner && (
        <div
          style={{
            background: 'rgba(52, 199, 89, 0.12)',
            border: '1px solid rgba(52, 199, 89, 0.35)',
            color: 'var(--status-delivered)',
            padding: '10px 14px',
            borderRadius: 8,
            fontSize: 13,
            marginBottom: 16,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          {banner}
          <button
            onClick={() => setBanner('')}
            style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 14 }}
          >
            ×
          </button>
        </div>
      )}

      <div style={{ marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
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
          {Object.entries(LEAD_STATUS_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
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
          <table style={{ width: '100%', minWidth: 900, borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--bg-panel)' }}>
              <tr>
                {['Contact', 'Company', 'Source', 'Status', 'Value', 'Assigned to', ''].map((h) => (
                  <th key={h} style={thStyle}>
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
                      <Spinner label="Loading leads…" />
                    </div>
                  </td>
                </tr>
              )}
              {!loading && leads.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No leads yet. Add your first one to start tracking the pipeline.
                  </td>
                </tr>
              )}
              {leads.map((l) => (
                <tr key={l._id}>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 600 }}>{l.name}</div>
                    {l.email && (
                      <div className="mono" style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                        {l.email}
                      </div>
                    )}
                  </td>
                  <td style={tdStyle}>{l.company || '—'}</td>
                  <td style={tdStyle}>{LEAD_SOURCE_LABELS[l.source] || l.source}</td>
                  <td style={tdStyle}>
                    <span style={pillStyle(LEAD_STATUS_COLORS[l.status])}>{LEAD_STATUS_LABELS[l.status]}</span>
                  </td>
                  <td style={tdStyle} className="mono">
                    {exactMoney(l.estimatedValue)}
                  </td>
                  <td style={tdStyle}>{l.assignedTo?.name || '—'}</td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        onClick={() => {
                          setEditingLead(l);
                          setShowForm(true);
                        }}
                        style={iconBtnStyle}
                      >
                        Edit
                      </button>
                      {!l.convertedToClient && l.status !== 'lost' && (
                        <button
                          onClick={() => handleConvert(l)}
                          disabled={convertingId === l._id}
                          style={{ ...iconBtnStyle, color: 'var(--status-delivered)' }}
                        >
                          {convertingId === l._id ? 'Converting…' : 'Convert to client'}
                        </button>
                      )}
                      <button
                        onClick={() => setConfirmDelete(l)}
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
        <LeadFormModal
          lead={editingLead}
          teamMembers={teamMembers}
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
          title="Delete lead"
          message={`Delete ${confirmDelete.name}? This cannot be undone.`}
          confirmLabel="Delete lead"
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
