import { useEffect, useMemo, useState } from 'react';
import PageShell from '../components/PageShell';
import ExpenseFormModal from '../components/ExpenseFormModal';
import ConfirmModal from '../components/ConfirmModal';
import Spinner from '../components/Spinner';
import SearchInput from '../components/SearchInput';
import api from '../api/axios';
import { exactBDT } from '../utils/currency';
import { EXPENSE_CATEGORY_LABELS, PAYMENT_METHOD_LABELS } from '../erp/badges';

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (categoryFilter) params.category = categoryFilter;
      const [expRes, statsRes] = await Promise.all([
        api.get('/expenses', { params }),
        api.get('/expenses/stats'),
      ]);
      setExpenses(expRes.data);
      setStats(statsRes.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [categoryFilter]);

  const handleSubmit = async (form, id) => {
    if (id) {
      await api.put(`/expenses/${id}`, form);
    } else {
      await api.post('/expenses', form);
    }
  };

  const performDelete = async () => {
    await api.delete(`/expenses/${confirmDelete._id}`);
    setExpenses((list) => list.filter((e) => e._id !== confirmDelete._id));
    setConfirmDelete(null);
  };

  const filteredExpenses = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return expenses;
    return expenses.filter((e) => {
      const title = (e.title || '').toLowerCase();
      const vendor = (e.vendor || '').toLowerCase();
      const category = (EXPENSE_CATEGORY_LABELS[e.category] || '').toLowerCase();
      return title.includes(q) || vendor.includes(q) || category.includes(q);
    });
  }, [expenses, search]);

  const total = useMemo(() => filteredExpenses.reduce((sum, e) => sum + e.amount, 0), [filteredExpenses]);

  return (
    <PageShell
      title="Expenses"
      subtitle="Company spending — subscriptions, contractors, and overhead."
      actions={
        <button
          onClick={() => {
            setEditingExpense(null);
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
          + New expense
        </button>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 22 }}>
        <div style={cardStyle}>
          <div style={cardLabelStyle}>This month</div>
          <div className="mono" style={{ fontSize: 22, fontWeight: 700 }}>
            {exactBDT(stats?.thisMonthTotal ?? 0)}
          </div>
        </div>
        <div style={cardStyle}>
          <div style={cardLabelStyle}>Filtered total</div>
          <div className="mono" style={{ fontSize: 22, fontWeight: 700 }}>
            {exactBDT(total)}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{
            background: 'var(--bg-inset)',
            border: '1px solid var(--border-hairline)',
            borderRadius: 8,
            padding: '9px 12px',
            fontSize: 13.5,
            color: 'var(--text-primary)',
          }}
        >
          <option value="">All categories</option>
          {Object.entries(EXPENSE_CATEGORY_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <SearchInput value={search} onChange={setSearch} placeholder="Search expenses by title, vendor, or category…" />
        {search && (
          <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
            {filteredExpenses.length} of {expenses.length} match
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
          <table style={{ width: '100%', minWidth: 820, borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--bg-panel)' }}>
              <tr>
                {['Title', 'Category', 'Vendor', 'Payment', 'Date', 'Amount', ''].map((h) => (
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
                      <Spinner label="Loading expenses…" />
                    </div>
                  </td>
                </tr>
              )}
              {!loading && expenses.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No expenses recorded yet.
                  </td>
                </tr>
              )}
              {!loading && expenses.length > 0 && filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No expenses match "{search}".
                  </td>
                </tr>
              )}
              {filteredExpenses.map((e) => (
                <tr key={e._id}>
                  <td style={tdStyle}>{e.title}</td>
                  <td style={tdStyle}>{EXPENSE_CATEGORY_LABELS[e.category]}</td>
                  <td style={tdStyle}>{e.vendor || '—'}</td>
                  <td style={tdStyle}>{PAYMENT_METHOD_LABELS[e.paymentMethod]}</td>
                  <td style={tdStyle}>{new Date(e.date).toLocaleDateString()}</td>
                  <td style={tdStyle} className="mono">
                    {exactBDT(e.amount)}
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => {
                          setEditingExpense(e);
                          setShowForm(true);
                        }}
                        style={iconBtnStyle}
                      >
                        Edit
                      </button>
                      <button onClick={() => setConfirmDelete(e)} style={{ ...iconBtnStyle, color: 'var(--status-cancelled)' }}>
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
        <ExpenseFormModal
          expense={editingExpense}
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
          title="Delete expense"
          message={`Delete "${confirmDelete.title}"? This cannot be undone.`}
          confirmLabel="Delete expense"
          onConfirm={performDelete}
          onClose={() => setConfirmDelete(null)}
        />
      )}
    </PageShell>
  );
}

const cardStyle = {
  background: 'var(--bg-panel)',
  border: '1px solid var(--border-hairline-soft)',
  borderRadius: 'var(--radius-lg)',
  padding: '14px 16px',
};
const cardLabelStyle = {
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: 6,
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
const iconBtnStyle = {
  background: 'transparent',
  border: '1px solid var(--border-hairline)',
  color: 'var(--text-secondary)',
  borderRadius: 6,
  padding: '5px 10px',
  fontSize: 12,
  cursor: 'pointer',
};
