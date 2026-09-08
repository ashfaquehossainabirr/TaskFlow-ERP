import { useMemo, useState } from 'react';
import Modal from './Modal';
import EmployeeSearchSelect from './EmployeeSearchSelect';
import { fieldWrap, labelStyle, inputStyle, primaryBtn, secondaryBtn, errorBanner } from './formStyles';
import { STATUS_LABELS } from '../utils/deadline';

const toDateInputValue = (d) => {
  if (!d) return '';
  const date = new Date(d);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 10);
};

export default function TaskFormModal({ task, employees, projects, onClose, onSaved, onSubmit }) {
  const isEdit = Boolean(task);
  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    project: task?.project?._id || task?.project || '',
    projectValue: task?.projectValue ?? '',
    milestone: task?.milestone || '',
    priority: task?.priority || 'medium',
    deadline: toDateInputValue(task?.deadline) || '',
    assignedTo: task?.assignedTo?._id || task?.assignedTo || '',
    status: task?.status || 'todo',
  });

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const update = (key) => (e) =>
    setForm((f) => ({
      ...f,
      [key]: e.target.value,
      ...(key === 'project'
        ? {
            milestone: '',
          }
        : {}),
    }));

  const gridFieldWrap = { ...fieldWrap, marginBottom: 0 };

  const availableMilestones = useMemo(() => {
    const selected = projects.find((p) => p._id === form.project);
    return selected?.milestones || [];
  }, [projects, form.project]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.title || !form.project || !form.deadline || !form.assignedTo) {
      setError('Please fill in title, project, deadline and assignee.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        milestone: form.milestone || null,
        projectValue: form.projectValue === '' ? null : Number(form.projectValue),
      };
      await onSubmit(payload, task?._id);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong while saving the task.');
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <Modal title={isEdit ? 'Edit task' : 'Create & assign task'} onClose={onClose} width={640}>
      <style>{`
        .tf-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px 14px;
          margin-bottom: 16px;
        }
        .tf-field-full {
          grid-column: 1 / -1;
        }
        @media (max-width: 760px) {
          .tf-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 480px) {
          .tf-grid {
            grid-template-columns: 1fr;
            gap: 14px;
          }
        }
      `}</style>
      <form onSubmit={handleSubmit}>
        {error && <div style={errorBanner}>{error}</div>}

        <div style={fieldWrap}>
          <label style={labelStyle}>Task title</label>
          <input
            style={inputStyle}
            value={form.title}
            onChange={update('title')}
            placeholder="e.g. Build login page"
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
            placeholder="Optional details about the task"
          />
        </div>

        <div className="tf-grid">
          <div className="tf-field-full" style={gridFieldWrap}>
            <label style={labelStyle}>Project</label>
            <select style={inputStyle} value={form.project} onChange={update('project')}>
              <option value="">Select a project…</option>
              {projects.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div style={gridFieldWrap}>
            <label style={labelStyle}>Milestone (optional)</label>
            <select
              style={inputStyle}
              value={form.milestone}
              onChange={update('milestone')}
              disabled={!form.project || availableMilestones.length === 0}
            >
              <option value="">
                {!form.project
                  ? 'Pick a project first'
                  : availableMilestones.length === 0
                    ? 'No milestones on this project'
                    : 'None'}
              </option>
              {availableMilestones.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.title}
                </option>
              ))}
            </select>
          </div>

          <div style={gridFieldWrap}>
            <label style={labelStyle}>Project value</label>
            <input
              type="number"
              min="0"
              step="0.01"
              style={inputStyle}
              value={form.projectValue}
              onChange={update('projectValue')}
              placeholder="e.g. 5000"
            />
          </div>

          <div style={gridFieldWrap}>
            <label style={labelStyle}>Priority</label>
            <select style={inputStyle} value={form.priority} onChange={update('priority')}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div style={gridFieldWrap}>
            <label style={labelStyle}>Status</label>
            <select style={inputStyle} value={form.status} onChange={update('status')}>
              {Object.keys(STATUS_LABELS).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>

          <div style={gridFieldWrap}>
            <label style={labelStyle}>Deadline</label>
            <input type="date" style={inputStyle} value={form.deadline} onChange={update('deadline')} />
          </div>

          <div className="tf-field-full" style={gridFieldWrap}>
            <label style={labelStyle}>Assign to employee</label>
            <EmployeeSearchSelect
              employees={employees}
              value={form.assignedTo}
              onChange={(id) => setForm((f) => ({ ...f, assignedTo: id }))}
              placeholder="Search employees…"
            />
          </div>
        </div>

        {projects.length === 0 && (
          <div
            style={{
              ...errorBanner,
              background: 'rgba(240, 168, 63, 0.1)',
              border: '1px solid rgba(240, 168, 63, 0.3)',
              color: 'var(--text-warning)',
            }}
          >
            No projects exist yet. Create one from the Projects page first.
          </div>
        )}

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
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create task'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
