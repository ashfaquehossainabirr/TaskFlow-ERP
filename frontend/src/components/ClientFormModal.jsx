import { useState } from 'react';
import Modal from './Modal';
import { fieldWrap, labelStyle, inputStyle, primaryBtn, secondaryBtn, errorBanner } from './formStyles';

export default function ClientFormModal({ client, onClose, onSaved, onSubmit }) {
  const isEdit = Boolean(client);

  const [form, setForm] = useState({
    name: client?.name || '',
    company: client?.company || '',
    email: client?.email || '',
    phone: client?.phone || '',
    industry: client?.industry || '',
    address: client?.address || '',
    status: client?.status || 'active',
    notes: client?.notes || '',
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
    if (!form.name.trim()) {
      setError('Client name is required.');
      return;
    }
    setSaving(true);
    try {
      await onSubmit(form, client?._id);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong while saving the client.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={isEdit ? 'Edit client' : 'New client'} onClose={onClose} width={520}>
      <style>{`
        .form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        @media (max-width: 480px) { .form-grid-2 { grid-template-columns: 1fr; } }
      `}</style>
      <form onSubmit={handleSubmit}>
        {error && <div style={errorBanner}>{error}</div>}

        <div className="form-grid-2">
          <div style={fieldWrap}>
            <label style={labelStyle}>Contact name</label>
            <input style={inputStyle} value={form.name} onChange={update('name')} placeholder="e.g. Sarah Chen" />
          </div>
          <div style={fieldWrap}>
            <label style={labelStyle}>Company</label>
            <input style={inputStyle} value={form.company} onChange={update('company')} placeholder="e.g. Northwind Inc." />
          </div>
        </div>

        <div className="form-grid-2">
          <div style={fieldWrap}>
            <label style={labelStyle}>Email</label>
            <input type="email" style={inputStyle} value={form.email} onChange={update('email')} placeholder="sarah@northwind.com" />
          </div>
          <div style={fieldWrap}>
            <label style={labelStyle}>Phone</label>
            <input style={inputStyle} value={form.phone} onChange={update('phone')} placeholder="Optional" />
          </div>
        </div>

        <div className="form-grid-2">
          <div style={fieldWrap}>
            <label style={labelStyle}>Industry</label>
            <input style={inputStyle} value={form.industry} onChange={update('industry')} placeholder="e.g. FinTech" />
          </div>
          <div style={fieldWrap}>
            <label style={labelStyle}>Status</label>
            <select style={inputStyle} value={form.status} onChange={update('status')}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div style={fieldWrap}>
          <label style={labelStyle}>Address</label>
          <input style={inputStyle} value={form.address} onChange={update('address')} placeholder="Optional" />
        </div>

        <div style={fieldWrap}>
          <label style={labelStyle}>Notes</label>
          <textarea
            style={{ ...inputStyle, minHeight: 72, resize: 'vertical' }}
            value={form.notes}
            onChange={update('notes')}
            placeholder="Context about this client…"
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
          <button type="button" style={secondaryBtn} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" style={primaryBtn} disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create client'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
