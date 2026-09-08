import { useState } from 'react';
import Modal from './Modal';
import { secondaryBtn } from './formStyles';

const dangerBtn = {
  background: 'var(--status-cancelled)',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  padding: '10px 18px',
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
};

export default function ConfirmModal({
  title = 'Confirm delete',
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  onConfirm,
  onClose,
}) {
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={title} onClose={busy ? () => {} : onClose} width={400}>
      <p
        style={{
          fontSize: 14,
          color: 'var(--text-secondary)',
          lineHeight: 1.5,
          margin: '0 0 22px',
        }}
      >
        {message}
      </p>
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 10,
        }}
      >
        <button type="button" style={secondaryBtn} onClick={onClose} disabled={busy}>
          {cancelLabel}
        </button>
        <button
          type="button"
          style={{
            ...dangerBtn,
            opacity: busy ? 0.7 : 1,
            cursor: busy ? 'default' : 'pointer',
          }}
          onClick={handleConfirm}
          disabled={busy}
        >
          {busy ? 'Deleting…' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
