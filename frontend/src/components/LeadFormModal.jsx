import { useState } from 'react';
import Modal from './Modal';
import { fieldWrap, labelStyle, inputStyle, primaryBtn, secondaryBtn, errorBanner } from './formStyles';
import { LEAD_STATUS_LABELS, LEAD_SOURCE_LABELS } from '../erp/badges';

export default function LeadFormModal({ lead, teamMembers, onClose, onSaved, onSubmit }) {
  const isEdit = Boolean(lead);

  const [form, setForm] = useState({
    name: lead?.name || '',
    company: lead?.company || '',
    email: lead?.email || '',
    phone: lead?.phone || '',
    source: lead?.source || 'other',
    status: lead?.status || 'new',
    estimatedValue: lead?.estimatedValue ?? '',
    assignedTo: lead?.assignedTo?._id || lead?.assignedTo || '',
    notes: lead?.notes || '',
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
      setError('Contact name is required.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        estimatedValue: form.estimatedValue === '' ? 0 : Number(form.estimatedValue),
      };
      await onSubmit(payload, lead?._id);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong while saving the lead.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={isEdit ? 'Edit lead' : 'New lead'} onClose={onClose} width={520}>
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
            <label style={labelStyle}>Source</label>
            <select style={inputStyle} value={form.source} onChange={update('source')}>
              {Object.entries(LEAD_SOURCE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div style={fieldWrap}>
            <label style={labelStyle}>Status</label>
            <select style={inputStyle} value={form.status} onChange={update('status')}>
              {Object.entries(LEAD_STATUS_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-grid-2">
          <div style={fieldWrap}>
            <label style={labelStyle}>Estimated deal value ($)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              style={inputStyle}
              value={form.estimatedValue}
              onChange={update('estimatedValue')}
              placeholder="e.g. 5000"
            />
          </div>
          <div style={fieldWrap}>
            <label style={labelStyle}>Assigned to</label>
            <select style={inputStyle} value={form.assignedTo} onChange={update('assignedTo')}>
              <option value="">Unassigned</option>
              {teamMembers.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={fieldWrap}>
          <label style={labelStyle}>Notes</label>
          <textarea
            style={{ ...inputStyle, minHeight: 72, resize: 'vertical' }}
            value={form.notes}
            onChange={update('notes')}
            placeholder="Context about this lead…"
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
          <button type="button" style={secondaryBtn} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" style={primaryBtn} disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create lead'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
