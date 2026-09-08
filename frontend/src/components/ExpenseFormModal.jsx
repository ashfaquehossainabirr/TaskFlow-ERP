import { useState } from 'react';
import Modal from './Modal';
import { fieldWrap, labelStyle, inputStyle, primaryBtn, secondaryBtn, errorBanner } from './formStyles';
import { EXPENSE_CATEGORY_LABELS, PAYMENT_METHOD_LABELS } from '../erp/badges';

const toDateInputValue = (d) => {
  if (!d) return '';
  const date = new Date(d);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 10);
};

export default function ExpenseFormModal({ expense, onClose, onSaved, onSubmit }) {
  const isEdit = Boolean(expense);

  const [form, setForm] = useState({
    title: expense?.title || '',
    category: expense?.category || 'other',
    amount: expense?.amount ?? '',
    date: toDateInputValue(expense?.date) || toDateInputValue(new Date()),
    vendor: expense?.vendor || '',
    paymentMethod: expense?.paymentMethod || 'bank-transfer',
    notes: expense?.notes || '',
  });

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const update = (key) => (e) =>
    setForm((f) => ({
      ...f,
      [key]: e.target.value,
    }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.title.trim()) {
      setError('Title is required.');
      return;
    }
    if (form.amount === '' || Number(form.amount) < 0) {
      setError('A valid amount is required.');
      return;
    }
    setSaving(true);
    try {
      await onSubmit({ ...form, amount: Number(form.amount) }, expense?._id);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong while saving the expense.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={isEdit ? 'Edit expense' : 'New expense'} onClose={onClose} width={480}>
      <style>{`
        .form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        @media (max-width: 480px) { .form-grid-2 { grid-template-columns: 1fr; } }
      `}</style>
      <form onSubmit={handleSubmit}>
        {error && <div style={errorBanner}>{error}</div>}

        <div style={fieldWrap}>
          <label style={labelStyle}>Title</label>
          <input style={inputStyle} value={form.title} onChange={update('title')} placeholder="e.g. Figma team subscription" />
        </div>

        <div className="form-grid-2">
          <div style={fieldWrap}>
            <label style={labelStyle}>Category</label>
            <select style={inputStyle} value={form.category} onChange={update('category')}>
              {Object.entries(EXPENSE_CATEGORY_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div style={fieldWrap}>
            <label style={labelStyle}>Amount ($)</label>
            <input type="number" min="0" step="0.01" style={inputStyle} value={form.amount} onChange={update('amount')} />
          </div>
        </div>

        <div className="form-grid-2">
          <div style={fieldWrap}>
            <label style={labelStyle}>Date</label>
            <input type="date" style={inputStyle} value={form.date} onChange={update('date')} />
          </div>
          <div style={fieldWrap}>
            <label style={labelStyle}>Payment method</label>
            <select style={inputStyle} value={form.paymentMethod} onChange={update('paymentMethod')}>
              {Object.entries(PAYMENT_METHOD_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={fieldWrap}>
          <label style={labelStyle}>Vendor</label>
          <input style={inputStyle} value={form.vendor} onChange={update('vendor')} placeholder="Optional" />
        </div>

        <div style={fieldWrap}>
          <label style={labelStyle}>Notes</label>
          <textarea
            style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }}
            value={form.notes}
            onChange={update('notes')}
            placeholder="Optional"
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
          <button type="button" style={secondaryBtn} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" style={primaryBtn} disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add expense'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
