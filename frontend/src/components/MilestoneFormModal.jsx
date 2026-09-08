import { useState } from 'react';
import Modal from './Modal';
import { fieldWrap, labelStyle, inputStyle, primaryBtn, secondaryBtn, errorBanner } from './formStyles';
import { MILESTONE_STATUS_LABELS } from './ProjectStatusBadge';

const toDateInputValue = (d) => {
  if (!d) return '';
  const date = new Date(d);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 10);
};

export default function MilestoneFormModal({ milestone, onClose, onSaved, onSubmit }) {
  const isEdit = Boolean(milestone);
  const [form, setForm] = useState({
    title: milestone?.title || '',
    description: milestone?.description || '',
    dueDate: toDateInputValue(milestone?.dueDate) || '',
    status: milestone?.status || 'pending',
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
    if (!form.title.trim() || !form.dueDate) {
      setError('Milestone title and due date are required.');
      return;
    }
    setSaving(true);
    try {
      await onSubmit(form, milestone?._id);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong while saving the milestone.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={isEdit ? 'Edit milestone' : 'New milestone'} onClose={onClose} width={460}>
      <form onSubmit={handleSubmit}>
        {error && <div style={errorBanner}>{error}</div>}

        <div style={fieldWrap}>
          <label style={labelStyle}>Milestone title</label>
          <input
            style={inputStyle}
            value={form.title}
            onChange={update('title')}
            placeholder="e.g. Design handoff"
          />
        </div>

        <div style={fieldWrap}>
          <label style={labelStyle}>Description</label>
          <textarea
            style={{
              ...inputStyle,
              minHeight: 64,
              resize: 'vertical',
            }}
            value={form.description}
            onChange={update('description')}
            placeholder="Optional details"
          />
        </div>

        <div style={fieldWrap}>
          <label style={labelStyle}>Due date</label>
          <input type="date" style={inputStyle} value={form.dueDate} onChange={update('dueDate')} />
        </div>

        <div style={fieldWrap}>
          <label style={labelStyle}>Status</label>
          <select style={inputStyle} value={form.status} onChange={update('status')}>
            {Object.keys(MILESTONE_STATUS_LABELS).map((s) => (
              <option key={s} value={s}>
                {MILESTONE_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
            marginTop: 20,
          }}
        >
          <button type="button" style={secondaryBtn} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" style={primaryBtn} disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add milestone'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
