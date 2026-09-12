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
  busyLabel = 'Deleting…',
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
        className="confirm-modal-actions"
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          flexWrap: 'wrap',
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
          {busy ? busyLabel : confirmLabel}
        </button>
      </div>
      <style>{`
        @media screen and (max-width: 480px) {
          .confirm-modal-actions {
            flex-direction: column-reverse;
          }
          .confirm-modal-actions button {
            width: 100%;
          }
        }
      `}</style>
    </Modal>
  );
}
