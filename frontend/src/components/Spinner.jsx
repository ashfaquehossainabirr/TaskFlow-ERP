/**
 * Branded loading spinner used across TaskFlow.
 *
 * size:  'sm' | 'md' | 'lg'  -> dot diameter presets
 * label: optional text shown next to/under the spinner
 * fullpage: renders centered in a full-viewport-height wrapper (for route-level loads)
 * inline: renders as a compact inline row (icon + label), for buttons/small areas
 */
export default function Spinner({ size = 'md', label, fullpage = false, inline = false }) {
  const dims = {
    sm: 16,
    md: 28,
    lg: 40,
  };
  const d = dims[size] || dims.md;

  const ring = (
    <span
      className="tf-spinner"
      style={{
        width: d,
        height: d,
        borderWidth: Math.max(2, Math.round(d / 10)),
      }}
      aria-hidden="true"
    />
  );

  // Full-page loads (route-level auth checks, etc.) get the branded mark —
  // matching the boot splash in index.html — instead of a plain ring, so the
  // app never dips back into a generic spinner once it's already loaded.
  const brandedMark = (
    <div className="tf-brand-mark" aria-hidden="true">
      <span className="tf-brand-ring" />
      <span className="tf-brand-ring tf-brand-ring--2" />
      <span className="tf-brand-logo">T</span>
    </div>
  );

  const content = inline ? (
    <span className="tf-spinner-inline">
      {ring}
      {label && <span className="tf-spinner-label tf-spinner-label--inline">{label}</span>}
    </span>
  ) : fullpage ? (
    <div className="tf-spinner-stack">
      {brandedMark}
      <span className="tf-brand-word">TaskFlow</span>
      <span className="tf-brand-bar"><span /></span>
      {label && <span className="tf-spinner-label">{label}</span>}
    </div>
  ) : (
    <div className="tf-spinner-stack">
      {ring}
      {label && <span className="tf-spinner-label">{label}</span>}
    </div>
  );

  return (
    <>
      <style>{`
        .tf-spinner {
          display: inline-block;
          border-style: solid;
          border-color: var(--border-hairline);
          border-top-color: var(--accent-cyan);
          border-radius: 50%;
          animation: tf-spin 0.7s linear infinite;
          flex-shrink: 0;
        }
        @keyframes tf-spin {
          to { transform: rotate(360deg); }
        }
        .tf-spinner-stack {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 18px;
        }
        .tf-spinner-inline {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .tf-spinner-label {
          color: var(--text-muted);
          font-size: 13.5px;
          letter-spacing: 0.01em;
        }
        .tf-spinner-label--inline {
          font-size: 13px;
        }
        .tf-spinner-fullpage {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          width: 100%;
          animation: tf-fade-in 0.35s ease;
        }
        .tf-brand-mark {
          position: relative;
          width: 64px;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .tf-brand-ring {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 2px solid transparent;
          border-top-color: var(--accent-cyan);
          border-right-color: var(--accent-cyan-dim);
          animation: tf-spin 1.1s cubic-bezier(0.6, 0.1, 0.4, 0.9) infinite;
        }
        .tf-brand-ring--2 {
          inset: -10px;
          border-top-color: transparent;
          border-right-color: transparent;
          border-bottom-color: var(--status-progress);
          border-left-color: var(--accent-cyan-dim);
          animation-duration: 1.7s;
          animation-direction: reverse;
        }
        .tf-brand-logo {
          position: relative;
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: linear-gradient(135deg, var(--accent-cyan), var(--status-progress));
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-mono);
          font-weight: 700;
          font-size: 17px;
          color: var(--text-on-accent);
          animation: tf-brand-pulse 1.8s ease-in-out infinite;
        }
        .tf-brand-word {
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 19px;
          letter-spacing: 0.01em;
          color: var(--text-primary);
          opacity: 0;
          animation: tf-boot-word-in 0.6s ease 0.15s forwards;
        }
        .tf-brand-bar {
          display: block;
          width: 120px;
          height: 3px;
          border-radius: 3px;
          background: var(--border-hairline-soft);
          overflow: hidden;
        }
        .tf-brand-bar span {
          display: block;
          height: 100%;
          width: 40%;
          border-radius: 3px;
          background: linear-gradient(90deg, var(--accent-cyan), var(--status-progress));
          animation: tf-brand-bar-sweep 1.15s ease-in-out infinite;
        }
        @keyframes tf-brand-bar-sweep {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(340%); }
        }
        @keyframes tf-brand-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
        @keyframes tf-boot-word-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes tf-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .tf-spinner,
          .tf-brand-ring,
          .tf-brand-logo,
          .tf-brand-bar span {
            animation-duration: 1.8s;
          }
          .tf-spinner-fullpage {
            animation: none;
          }
        }
      `}</style>
      {fullpage ? <div className="tf-spinner-fullpage">{content}</div> : content}
    </>
  );
}
