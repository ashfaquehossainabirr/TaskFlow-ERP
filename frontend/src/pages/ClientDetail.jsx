import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import PageShell from '../components/PageShell';
import ClientFormModal from '../components/ClientFormModal';
import Spinner from '../components/Spinner';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { exactMoney } from '../utils/currency';
import { CLIENT_STATUS_COLORS, INVOICE_STATUS_LABELS, INVOICE_STATUS_COLORS, pillStyle } from '../erp/badges';

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/clients/${id}`);
      setData(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const handleSubmit = async (form) => {
    await api.put(`/clients/${id}`, form);
  };

  if (loading) {
    return (
      <PageShell title="Client">
        <div style={{ padding: '60px 0' }}>
          <Spinner label="Loading client…" />
        </div>
      </PageShell>
    );
  }

  if (!data) {
    return (
      <PageShell title="Client not found">
        <button onClick={() => navigate('/clients')} style={{ ...backBtn }}>
          ← Back to clients
        </button>
      </PageShell>
    );
  }

  const { client, invoices } = data;

  return (
    <PageShell
      title={client.name}
      subtitle={client.company || 'Client details'}
      actions={
        <button onClick={() => setShowForm(true)} style={{ ...backBtn }}>
          Edit client
        </button>
      }
    >
      <button onClick={() => navigate('/clients')} style={{ ...backBtn, marginBottom: 16 }}>
        ← Back to clients
      </button>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <InfoCard label="Status">
          <span style={pillStyle(CLIENT_STATUS_COLORS[client.status])}>{client.status}</span>
        </InfoCard>
        <InfoCard label="Email">{client.email || '—'}</InfoCard>
        <InfoCard label="Phone">{client.phone || '—'}</InfoCard>
        <InfoCard label="Industry">{client.industry || '—'}</InfoCard>
      </div>

      {client.address && (
        <div style={{ marginBottom: 20, fontSize: 13.5, color: 'var(--text-secondary)' }}>
          <strong style={{ color: 'var(--text-primary)' }}>Address: </strong>
          {client.address}
        </div>
      )}

      {client.notes && (
        <div
          style={{
            background: 'var(--bg-inset)',
            border: '1px solid var(--border-hairline)',
            borderRadius: 'var(--radius-md)',
            padding: 14,
            fontSize: 13.5,
            color: 'var(--text-secondary)',
            marginBottom: 24,
            whiteSpace: 'pre-wrap',
          }}
        >
          {client.notes}
        </div>
      )}

      {user.role === 'admin' && (
        <>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, margin: '0 0 14px' }}>
            Invoices
          </h2>
          <div
            style={{
              background: 'var(--bg-panel)',
              border: '1px solid var(--border-hairline-soft)',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              padding: 10,
            }}
          >
            {invoices.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13.5 }}>
                No invoices for this client yet.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Invoice #', 'Status', 'Due date', 'Total', ''].map((h) => (
                      <th key={h} style={thStyle}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv._id}>
                      <td style={tdStyle} className="mono">
                        {inv.invoiceNumber}
                      </td>
                      <td style={tdStyle}>
                        <span style={pillStyle(INVOICE_STATUS_COLORS[inv.status])}>
                          {INVOICE_STATUS_LABELS[inv.status]}
                        </span>
                      </td>
                      <td style={tdStyle}>{new Date(inv.dueDate).toLocaleDateString()}</td>
                      <td style={tdStyle} className="mono">
                        {exactMoney(inv.total)}
                      </td>
                      <td style={tdStyle}>
                        <Link to="/invoices" style={{ color: 'var(--accent-cyan)', fontSize: 12.5, fontWeight: 600 }}>
                          View in Invoices →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {showForm && (
        <ClientFormModal
          client={client}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            load();
          }}
          onSubmit={handleSubmit}
        />
      )}
    </PageShell>
  );
}

function InfoCard({ label, children }) {
  return (
    <div
      style={{
        background: 'var(--bg-panel)',
        border: '1px solid var(--border-hairline-soft)',
        borderRadius: 'var(--radius-md)',
        padding: '14px 16px',
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 600 }}>{children}</div>
    </div>
  );
}

const backBtn = {
  background: 'transparent',
  border: '1px solid var(--border-hairline)',
  color: 'var(--text-secondary)',
  borderRadius: 8,
  padding: '8px 14px',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
};
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
