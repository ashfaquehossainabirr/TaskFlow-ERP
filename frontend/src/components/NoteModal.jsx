import { useState } from 'react';
import Modal from './Modal';
import api from '../api/axios';
import { fieldWrap, labelStyle, inputStyle, primaryBtn, secondaryBtn, errorBanner } from './formStyles';

export const NOTE_COLORS = [
  {
    value: 'default',
    label: 'Slate',
    swatch: 'var(--text-muted)',
  },
  {
    value: 'cyan',
    label: 'Cyan',
    swatch: 'var(--accent-cyan)',
  },
  {
    value: 'amber',
    label: 'Amber',
    swatch: 'var(--status-hold)',
  },
  {
    value: 'green',
    label: 'Green',
    swatch: 'var(--status-delivered)',
  },
  {
    value: 'red',
    label: 'Red',
    swatch: 'var(--status-cancelled)',
  },
  {
    value: 'violet',
    label: 'Violet',
    swatch: '#a78bfa',
  },
];

const colorSwatch = (color) => NOTE_COLORS.find((c) => c.value === color)?.swatch || NOTE_COLORS[0].swatch;

const formatDate = (iso) =>
  new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

export default function NoteModal({ note, onClose, onSaved, onDeleted }) {
  const isNew = !note;
  const [editing, setEditing] = useState(isNew);

  const [form, setForm] = useState({
    title: note?.title || '',
    content: note?.content || '',
    color: note?.color || 'default',
    pinned: note?.pinned || false,
  });

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const update = (key) => (e) =>
    setForm((f) => ({
      ...f,
      [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value,
    }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.title.trim()) {
      setError('Title is required.');
      return;
    }
    setSaving(true);
    try {
      let saved;
      if (isNew) {
        const res = await api.post('/notes', form);
        saved = res.data;
      } else {
        const res = await api.put(`/notes/${note._id}`, form);
        saved = res.data;
      }
      onSaved(saved);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong while saving the note.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError('');
    try {
      await api.delete(`/notes/${note._id}`);
      onDeleted(note._id);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete note.');
      setDeleting(false);
    }
  };

  const title = isNew ? 'New note' : editing ? 'Edit note' : note.title;
  
  return (
    <Modal title={title} onClose={onClose} width={520}>
      {error && <div style={errorBanner}>{error}</div>}

      {editing ? (
        <form onSubmit={handleSubmit}>
          <div style={fieldWrap}>
            <label style={labelStyle}>Title</label>
            <input
              style={inputStyle}
              value={form.title}
              onChange={update('title')}
              placeholder="e.g. Ideas for the client call"
              autoFocus
            />
          </div>

          <div style={fieldWrap}>
            <label style={labelStyle}>Note</label>
            <textarea
              style={{
                ...inputStyle,
                minHeight: 160,
                resize: 'vertical',
              }}
              value={form.content}
              onChange={update('content')}
              placeholder="Write your note…"
            />
          </div>

          <div style={fieldWrap}>
            <label style={labelStyle}>Color</label>
            <div
              style={{
                display: 'flex',
                gap: 8,
                flexWrap: 'wrap',
              }}
            >
              {NOTE_COLORS.map((c) => (
                <button
                  type="button"
                  key={c.value}
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      color: c.value,
                    }))
                  }
                  title={c.label}
                  aria-label={c.label}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: c.swatch,
                    border:
                      form.color === c.value ? '2px solid var(--text-primary)' : '2px solid transparent',
                    boxShadow: form.color === c.value ? '0 0 0 2px var(--bg-panel-raised)' : 'none',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                />
              ))}
            </div>
          </div>

          <div
            style={{
              ...fieldWrap,
              marginBottom: 4,
            }}
          >
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13.5,
                color: 'var(--text-secondary)',
              }}
            >
              <input type="checkbox" checked={form.pinned} onChange={update('pinned')} />
              Pin to top
            </label>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 10,
              marginTop: 20,
            }}
          >
            {!isNew && (
              <button
                type="button"
                style={secondaryBtn}
                onClick={() => {
                  setForm({
                    title: note.title,
                    content: note.content,
                    color: note.color,
                    pinned: note.pinned,
                  });
                  setError('');
                  setEditing(false);
                }}
              >
                Cancel
              </button>
            )}
            {isNew && (
              <button type="button" style={secondaryBtn} onClick={onClose}>
                Cancel
              </button>
            )}
            <button type="submit" style={primaryBtn} disabled={saving}>
              {saving ? 'Saving…' : isNew ? 'Create note' : 'Save changes'}
            </button>
          </div>
        </form>
      ) : (
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 14,
            }}
          >
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: colorSwatch(note.color),
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: 12,
                color: 'var(--text-muted)',
              }}
            >
              {note.pinned ? 'Pinned · ' : ''}Updated {formatDate(note.updatedAt)}
            </span>
          </div>

          <p
            style={{
              fontSize: 14.5,
              lineHeight: 1.7,
              color: 'var(--text-primary)',
              whiteSpace: 'pre-wrap',
              margin: '0 0 22px',
              minHeight: 40,
            }}
          >
            {note.content ? (
              note.content
            ) : (
              <span
                style={{
                  color: 'var(--text-muted)',
                }}
              >
                No additional details.
              </span>
            )}
          </p>

          <div
            style={{
              fontSize: 11.5,
              color: 'var(--text-muted)',
              marginBottom: 20,
            }}
          >
            Created {formatDate(note.createdAt)}
          </div>

          {confirmDelete ? (
            <div
              style={{
                border: '1px solid var(--chip-overdue-border)',
                background: 'var(--chip-overdue-bg)',
                borderRadius: 8,
                padding: 14,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  color: 'var(--text-primary)',
                }}
              >
                Delete this note? This cannot be undone.
              </span>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 10,
                }}
              >
                <button
                  type="button"
                  style={{
                    ...secondaryBtn,
                    color: 'var(--text-primary)',
                    border: '1px solid var(--text-primary)',
                  }}
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleting}
                >
                  Keep note
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  style={{
                    background: 'var(--status-cancelled)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '10px 18px',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10,
              }}
            >
              <button type="button" style={secondaryBtn} onClick={() => setConfirmDelete(true)}>
                Delete
              </button>
              <button type="button" style={primaryBtn} onClick={() => setEditing(true)}>
                Edit
              </button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
