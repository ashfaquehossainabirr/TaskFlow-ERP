import { useEffect, useMemo, useState } from 'react';
import PageShell from '../components/PageShell';
import InvoiceFormModal from '../components/InvoiceFormModal';
import ConfirmModal from '../components/ConfirmModal';
import Spinner from '../components/Spinner';
import SearchInput from '../components/SearchInput';
import api from '../api/axios';
import { downloadFile } from '../utils/download';
import { exactMoney } from '../utils/currency';
import { INVOICE_STATUS_LABELS, INVOICE_STATUS_COLORS, pillStyle } from '../erp/badges';

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [pdfError, setPdfError] = useState('');

  const handleDownloadPdf = async (inv) => {
    setDownloadingId(inv._id);
    setPdfError('');
    try {
      await downloadFile(`/invoices/${inv._id}/pdf`, `${inv.invoiceNumber}.pdf`);
    } catch (err) {
      setPdfError(err.response?.data?.message || 'Failed to download this invoice PDF.');
    } finally {
      setDownloadingId(null);
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const [invRes, clientsRes, projectsRes, statsRes] = await Promise.all([
        api.get('/invoices', { params }),
        api.get('/clients'),
        api.get('/projects'),
        api.get('/invoices/stats'),
      ]);
      setInvoices(invRes.data);
      setClients(clientsRes.data);
      setProjects(projectsRes.data);
      setStats(statsRes.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [statusFilter]);

  const handleSubmit = async (form, id) => {
    if (id) {
      await api.put(`/invoices/${id}`, form);
    } else {
      await api.post('/invoices', form);
    }
  };

  const markPaid = async (inv) => {
    await api.patch(`/invoices/${inv._id}/mark-paid`);
    load();
  };

  const performDelete = async () => {
    await api.delete(`/invoices/${confirmDelete._id}`);
    setInvoices((list) => list.filter((i) => i._id !== confirmDelete._id));
    setConfirmDelete(null);
  };

  const summaryCards = useMemo(
    () => [
      { label: 'Outstanding', value: stats?.outstanding ?? 0 },
      { label: 'Paid this month', value: stats?.paidThisMonth ?? 0 },
      { label: 'Overdue invoices', value: stats?.overdueCount ?? 0, isCount: true },
      { label: 'Total invoices', value: stats?.totalInvoices ?? 0, isCount: true },
    ],
    [stats]
  );

  const filteredInvoices = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return invoices;
    return invoices.filter((inv) => {
      const number = (inv.invoiceNumber || '').toLowerCase();
      const clientName = (inv.client?.name || '').toLowerCase();
      const clientCompany = (inv.client?.company || '').toLowerCase();
      const projectName = (inv.project?.name || '').toLowerCase();
      return number.includes(q) || clientName.includes(q) || clientCompany.includes(q) || projectName.includes(q);
    });
  }, [invoices, search]);

  return (
    <PageShell
      title="Invoices"
      subtitle="Bill clients and track what's outstanding."
      actions={
        <button
          onClick={() => {
            setEditingInvoice(null);
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
          + New invoice
        </button>
      }
    >
      {pdfError && (
        <div
          style={{
            background: 'rgba(239, 100, 97, 0.1)',
            border: '1px solid rgba(239, 100, 97, 0.35)',
            color: 'var(--text-error)',
            padding: '10px 12px',
            borderRadius: 8,
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          {pdfError}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 22 }}>
        {summaryCards.map((c) => (
          <div
            key={c.label}
            style={{
              background: 'var(--bg-panel)',
              border: '1px solid var(--border-hairline-soft)',
              borderRadius: 'var(--radius-lg)',
              padding: '14px 16px',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
              {c.label}
            </div>
            <div className="mono" style={{ fontSize: 22, fontWeight: 700 }}>
              {c.isCount ? c.value : exactMoney(c.value)}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
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
          {Object.entries(INVOICE_STATUS_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <SearchInput value={search} onChange={setSearch} placeholder="Search invoices by number, client, or project…" />
        {search && (
          <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
            {filteredInvoices.length} of {invoices.length} match
          </span>
        )}
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
                {['Invoice #', 'Client', 'Status', 'Issue date', 'Due date', 'Total', ''].map((h) => (
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
                      <Spinner label="Loading invoices…" />
                    </div>
                  </td>
                </tr>
              )}
              {!loading && invoices.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No invoices yet.
                  </td>
                </tr>
              )}
              {!loading && invoices.length > 0 && filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No invoices match "{search}".
                  </td>
                </tr>
              )}
              {filteredInvoices.map((inv) => (
                <tr key={inv._id}>
                  <td style={tdStyle} className="mono">
                    {inv.invoiceNumber}
                  </td>
                  <td style={tdStyle}>{inv.client?.name || '—'}</td>
                  <td style={tdStyle}>
                    <span style={pillStyle(INVOICE_STATUS_COLORS[inv.status])}>{INVOICE_STATUS_LABELS[inv.status]}</span>
                  </td>
                  <td style={tdStyle}>{new Date(inv.issueDate).toLocaleDateString()}</td>
                  <td style={tdStyle}>{new Date(inv.dueDate).toLocaleDateString()}</td>
                  <td style={tdStyle} className="mono">
                    {exactMoney(inv.total)}
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        onClick={() => handleDownloadPdf(inv)}
                        disabled={downloadingId === inv._id}
                        style={iconBtnStyle}
                      >
                        {downloadingId === inv._id ? 'Preparing…' : 'PDF'}
                      </button>
                      <button
                        onClick={() => {
                          setEditingInvoice(inv);
                          setShowForm(true);
                        }}
                        style={iconBtnStyle}
                      >
                        Edit
                      </button>
                      {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                        <button onClick={() => markPaid(inv)} style={{ ...iconBtnStyle, color: 'var(--status-delivered)' }}>
                          Mark paid
                        </button>
                      )}
                      <button onClick={() => setConfirmDelete(inv)} style={{ ...iconBtnStyle, color: 'var(--status-cancelled)' }}>
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
        <InvoiceFormModal
          invoice={editingInvoice}
          clients={clients}
          projects={projects}
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
          title="Delete invoice"
          message={`Delete ${confirmDelete.invoiceNumber}? This cannot be undone.`}
          confirmLabel="Delete invoice"
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
