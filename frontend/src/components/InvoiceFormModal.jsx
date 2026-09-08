import { useState } from 'react';
import Modal from './Modal';
import { fieldWrap, labelStyle, inputStyle, primaryBtn, secondaryBtn, errorBanner } from './formStyles';
import { INVOICE_STATUS_LABELS } from '../erp/badges';
import { exactMoney } from '../utils/currency';

const toDateInputValue = (d) => {
  if (!d) return '';
  const date = new Date(d);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 10);
};

const emptyItem = () => ({ description: '', quantity: 1, rate: 0 });

export default function InvoiceFormModal({ invoice, clients, projects, onClose, onSaved, onSubmit }) {
  const isEdit = Boolean(invoice);

  const [form, setForm] = useState({
    client: invoice?.client?._id || invoice?.client || '',
    project: invoice?.project?._id || invoice?.project || '',
    status: invoice?.status || 'draft',
    issueDate: toDateInputValue(invoice?.issueDate) || toDateInputValue(new Date()),
    dueDate: toDateInputValue(invoice?.dueDate) || '',
    taxPercent: invoice?.taxPercent ?? 0,
    discount: invoice?.discount ?? 0,
    notes: invoice?.notes || '',
  });
  const [items, setItems] = useState(
    invoice?.items?.length ? invoice.items.map((it) => ({ ...it })) : [emptyItem()]
  );

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const update = (key) => (e) =>
    setForm((f) => ({
      ...f,
      [key]: e.target.value,
    }));

  const updateItem = (idx, key) => (e) => {
    const value = key === 'description' ? e.target.value : Number(e.target.value);
    setItems((list) => list.map((it, i) => (i === idx ? { ...it, [key]: value } : it)));
  };

  const addItem = () => setItems((list) => [...list, emptyItem()]);
  const removeItem = (idx) => setItems((list) => (list.length > 1 ? list.filter((_, i) => i !== idx) : list));

  const subtotal = items.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.rate) || 0), 0);
  const taxAmount = (subtotal * (Number(form.taxPercent) || 0)) / 100;
  const total = Math.max(0, subtotal + taxAmount - (Number(form.discount) || 0));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.client) {
      setError('Client is required.');
      return;
    }
    if (!form.dueDate) {
      setError('Due date is required.');
      return;
    }
    if (items.some((it) => !it.description.trim())) {
      setError('Every line item needs a description.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        project: form.project || null,
        taxPercent: Number(form.taxPercent) || 0,
        discount: Number(form.discount) || 0,
        items: items.map((it) => ({
          description: it.description,
          quantity: Number(it.quantity) || 0,
          rate: Number(it.rate) || 0,
        })),
      };
      await onSubmit(payload, invoice?._id);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong while saving the invoice.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={isEdit ? `Edit ${invoice.invoiceNumber}` : 'New invoice'} onClose={onClose} width={640}>
      <style>{`
        .form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .form-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
        @media (max-width: 480px) { .form-grid-2, .form-grid-3 { grid-template-columns: 1fr; } }
        .item-row { display: grid; grid-template-columns: 1fr 70px 90px 90px 28px; gap: 8px; align-items: center; margin-bottom: 8px; }
        @media (max-width: 560px) { .item-row { grid-template-columns: 1fr 1fr; } }
      `}</style>
      <form onSubmit={handleSubmit}>
        {error && <div style={errorBanner}>{error}</div>}

        <div className="form-grid-2">
          <div style={fieldWrap}>
            <label style={labelStyle}>Client</label>
            <select style={inputStyle} value={form.client} onChange={update('client')}>
              <option value="">Select a client…</option>
              {clients.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} {c.company ? `(${c.company})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div style={fieldWrap}>
            <label style={labelStyle}>Project (optional)</label>
            <select style={inputStyle} value={form.project} onChange={update('project')}>
              <option value="">No linked project</option>
              {projects.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-grid-3">
          <div style={fieldWrap}>
            <label style={labelStyle}>Status</label>
            <select style={inputStyle} value={form.status} onChange={update('status')}>
              {Object.entries(INVOICE_STATUS_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div style={fieldWrap}>
            <label style={labelStyle}>Issue date</label>
            <input type="date" style={inputStyle} value={form.issueDate} onChange={update('issueDate')} />
          </div>
          <div style={fieldWrap}>
            <label style={labelStyle}>Due date</label>
            <input type="date" style={inputStyle} value={form.dueDate} onChange={update('dueDate')} />
          </div>
        </div>

        <div style={{ ...fieldWrap, marginTop: 4 }}>
          <label style={labelStyle}>Line items</label>
          <div className="item-row" style={{ marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Description</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Qty</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Rate</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Amount</span>
            <span />
          </div>
          {items.map((it, idx) => (
            <div className="item-row" key={idx}>
              <input
                style={inputStyle}
                value={it.description}
                onChange={updateItem(idx, 'description')}
                placeholder="e.g. Frontend development — Sprint 3"
              />
              <input
                type="number"
                min="0"
                step="0.5"
                style={inputStyle}
                value={it.quantity}
                onChange={updateItem(idx, 'quantity')}
              />
              <input
                type="number"
                min="0"
                step="0.01"
                style={inputStyle}
                value={it.rate}
                onChange={updateItem(idx, 'rate')}
              />
              <div style={{ fontSize: 13, fontWeight: 600 }} className="mono">
                {exactMoney((Number(it.quantity) || 0) * (Number(it.rate) || 0))}
              </div>
              <button
                type="button"
                onClick={() => removeItem(idx)}
                style={{ background: 'transparent', border: 'none', color: 'var(--status-cancelled)', cursor: 'pointer', fontSize: 16 }}
                aria-label="Remove item"
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addItem}
            style={{ ...secondaryBtn, marginTop: 4, padding: '6px 12px', fontSize: 12.5 }}
          >
            + Add line item
          </button>
        </div>

        <div className="form-grid-2" style={{ marginTop: 8 }}>
          <div style={fieldWrap}>
            <label style={labelStyle}>Tax (%)</label>
            <input type="number" min="0" step="0.1" style={inputStyle} value={form.taxPercent} onChange={update('taxPercent')} />
          </div>
          <div style={fieldWrap}>
            <label style={labelStyle}>Discount ($)</label>
            <input type="number" min="0" step="0.01" style={inputStyle} value={form.discount} onChange={update('discount')} />
          </div>
        </div>

        <div
          style={{
            background: 'var(--bg-inset)',
            border: '1px solid var(--border-hairline)',
            borderRadius: 8,
            padding: '12px 16px',
            marginBottom: 16,
            fontSize: 13.5,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ color: 'var(--text-secondary)' }}>Subtotal</span>
            <span className="mono">{exactMoney(subtotal)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ color: 'var(--text-secondary)' }}>Tax</span>
            <span className="mono">{exactMoney(taxAmount)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ color: 'var(--text-secondary)' }}>Discount</span>
            <span className="mono">−{exactMoney(form.discount || 0)}</span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              paddingTop: 8,
              marginTop: 4,
              borderTop: '1px solid var(--border-hairline)',
              fontWeight: 700,
              fontSize: 15,
            }}
          >
            <span>Total</span>
            <span className="mono">{exactMoney(total)}</span>
          </div>
        </div>

        <div style={fieldWrap}>
          <label style={labelStyle}>Notes</label>
          <textarea
            style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }}
            value={form.notes}
            onChange={update('notes')}
            placeholder="Payment terms, thank-you note, etc."
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
          <button type="button" style={secondaryBtn} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" style={primaryBtn} disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create invoice'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
