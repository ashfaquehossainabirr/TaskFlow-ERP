import { createPortal } from 'react-dom';

export default function Modal({ title, onClose, children, width = 480 }) {
  const modal = (
    <div
      onClick={onClose}
      className="app-modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--overlay-scrim)',
        backdropFilter: 'blur(2px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999,
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="app-modal-box"
        style={{
          width: '100%',
          maxWidth: width,
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-panel-raised)',
          border: '1px solid var(--border-hairline)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
        }}
      >
        <div
          className="app-modal-header"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            padding: '18px 22px',
            borderBottom: '1px solid var(--border-hairline-soft)',
            flexShrink: 0,
            position: 'sticky',
            top: 0,
            background: 'inherit',
            borderTopLeftRadius: 'var(--radius-lg)',
            borderTopRightRadius: 'var(--radius-lg)',
            zIndex: 1,
          }}
        >
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 17,
              fontWeight: 700,
              margin: 0,
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: 20,
              cursor: 'pointer',
              lineHeight: 1,
              padding: 4,
              flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>
        <div
          className="app-modal-body"
          style={{
            padding: 22,
            overflowY: 'auto',
            minHeight: 0,
          }}
        >
          {children}
        </div>
      </div>
      <style>{`
        [data-theme='light'] .app-modal-box {
          background: var(--bg-panel) !important;
        }

        @keyframes app-modal-overlay-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes app-modal-box-in {
          from {
            opacity: 0;
            transform: translateY(18px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .app-modal-overlay {
          animation: app-modal-overlay-in 0.2s ease both;
        }
        .app-modal-box {
          animation: app-modal-box-in 0.28s cubic-bezier(0.2, 0.7, 0.3, 1) both;
        }
        @media (prefers-reduced-motion: reduce) {
          .app-modal-overlay,
          .app-modal-box {
            animation-duration: 0.001ms !important;
          }
        }

        @media screen and (max-width: 640px) {
          .app-modal-overlay {
            padding: 0 !important;
            align-items: flex-end !important;
          }
          .app-modal-box {
            max-width: 100% !important;
            width: 100% !important;
            max-height: 92dvh !important;
            border-radius: var(--radius-lg) var(--radius-lg) 0 0 !important;
          }
          .app-modal-header {
            padding: 14px 16px !important;
          }
          .app-modal-body {
            padding: 16px !important;
          }
        }
      `}</style>
    </div>
  );

  return createPortal(modal, document.body);
}
