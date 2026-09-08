import { useState } from 'react';
import Modal from './Modal';
import { fieldWrap, labelStyle, inputStyle, primaryBtn, secondaryBtn, errorBanner } from './formStyles';
import { PROJECT_STATUS_LABELS } from './ProjectStatusBadge';

const toDateInputValue = (d) => {
  if (!d) return '';
  const date = new Date(d);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 10);
};

export default function ProjectFormModal({ project, onClose, onSaved, onSubmit }) {
  const isEdit = Boolean(project);

  const [form, setForm] = useState({
    name: project?.name || '',
    description: project?.description || '',
    client: project?.client || '',
    status: project?.status || 'planning',
    startDate: toDateInputValue(project?.startDate) || '',
    targetEndDate: toDateInputValue(project?.targetEndDate) || '',
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
      setError('Project name is required.');
      return;
    }
    setSaving(true);
    try {
      await onSubmit(form, project?._id);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong while saving the project.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={isEdit ? 'Edit project' : 'New project'} onClose={onClose} width={520}>
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
          <label style={labelStyle}>Project name</label>
          <input
            style={inputStyle}
            value={form.name}
            onChange={update('name')}
            placeholder="e.g. Website Revamp"
          />
        </div>

        <div style={fieldWrap}>
          <label style={labelStyle}>Description</label>
          <textarea
            style={{
              ...inputStyle,
              minHeight: 72,
              resize: 'vertical',
            }}
            value={form.description}
            onChange={update('description')}
            placeholder="Optional summary of what this project covers"
          />
        </div>

        <div className="form-grid-2">
          <div style={fieldWrap}>
            <label style={labelStyle}>Client (optional)</label>
            <input
              style={inputStyle}
              value={form.client}
              onChange={update('client')}
              placeholder="e.g. Acme Corp"
            />
          </div>
          <div style={fieldWrap}>
            <label style={labelStyle}>Status</label>
            <select style={inputStyle} value={form.status} onChange={update('status')}>
              {Object.keys(PROJECT_STATUS_LABELS).map((s) => (
                <option key={s} value={s}>
                  {PROJECT_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-grid-2">
          <div style={fieldWrap}>
            <label style={labelStyle}>Start date</label>
            <input type="date" style={inputStyle} value={form.startDate} onChange={update('startDate')} />
          </div>
          <div style={fieldWrap}>
            <label style={labelStyle}>Target end date</label>
            <input
              type="date"
              style={inputStyle}
              value={form.targetEndDate}
              onChange={update('targetEndDate')}
            />
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
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create project'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
