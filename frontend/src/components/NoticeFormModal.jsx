import { useState } from 'react';
import Modal from './Modal';
import { fieldWrap, labelStyle, inputStyle, primaryBtn, secondaryBtn, errorBanner } from './formStyles';

const PRIORITY_LABELS = {
  normal: 'Normal',
  important: 'Important',
  urgent: 'Urgent',
};

export default function NoticeFormModal({ onClose, onSaved, onSubmit }) {
  const [form, setForm] = useState({
    title: '',
    message: '',
    priority: 'normal',
    pinned: false,
  });

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const update = (key) => (e) =>
    setForm((f) => ({
      ...f,
      [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value,
    }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.title.trim() || !form.message.trim()) {
      setError('Title and message are required.');
      return;
    }
    setSaving(true);
    try {
      await onSubmit(form);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong while posting the notice.');
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <Modal title="Post a notice" onClose={onClose} width={480}>
      <style>{`
        .form-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        @media (max-width: 480px) {
          .form-grid-2 {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
      <form onSubmit={handleSubmit}>
        {error && <div style={errorBanner}>{error}</div>}

        <div style={fieldWrap}>
          <label style={labelStyle}>Title</label>
          <input
            style={inputStyle}
            value={form.title}
            onChange={update('title')}
            placeholder="e.g. Office closed Monday"
          />
        </div>

        <div style={fieldWrap}>
          <label style={labelStyle}>Message</label>
          <textarea
            style={{
              ...inputStyle,
              minHeight: 100,
              resize: 'vertical',
            }}
            value={form.message}
            onChange={update('message')}
            placeholder="Details everyone should know…"
          />
        </div>

        <div className="form-grid-2">
          <div style={fieldWrap}>
            <label style={labelStyle}>Priority</label>
            <select style={inputStyle} value={form.priority} onChange={update('priority')}>
              {Object.keys(PRIORITY_LABELS).map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABELS[p]}
                </option>
              ))}
            </select>
          </div>
          <div
            style={{
              ...fieldWrap,
              justifyContent: 'flex-end',
            }}
          >
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13.5,
                color: 'var(--text-secondary)',
                paddingBottom: 10,
              }}
            >
              <input type="checkbox" checked={form.pinned} onChange={update('pinned')} />
              Pin to top
            </label>
          </div>
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
            {saving ? 'Posting…' : 'Post notice'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
