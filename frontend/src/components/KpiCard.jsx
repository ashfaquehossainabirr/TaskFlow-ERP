import { useState } from 'react';
import { exactMoney, exactBDT } from '../utils/currency';

const AVATAR_PALETTE = [
  'var(--accent-cyan)',
  'var(--status-progress)',
  'var(--status-hold)',
  'var(--status-delivered)',
  'var(--status-cancelled)',
];

const STATUS_META = {
  pending: { label: 'Pending', color: 'var(--text-muted)', bg: 'var(--bg-inset)', border: 'var(--border-hairline)' },
  approved: {
    label: 'Approved',
    color: 'var(--text-info)',
    bg: 'var(--chip-soon-bg)',
    border: 'var(--chip-soon-border)',
  },
  paid: {
    label: 'Paid',
    color: 'var(--status-delivered)',
    bg: 'color-mix(in srgb, var(--status-delivered) 14%, transparent)',
    border: 'color-mix(in srgb, var(--status-delivered) 40%, transparent)',
  },
};

function hashColor(str = '') {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function KpiCard({ kpi, isAdmin = false, onMark }) {
  const [busy, setBusy] = useState(false);
  const { name, email, department, target, achieved, excess, bonusAmount, taskCount, status } = kpi;

  const passed = target > 0 && achieved >= target;
  const progressPct = target > 0 ? Math.min(100, (achieved / target) * 100) : 0;
  const remaining = Math.max(0, target - achieved);
  const meta = STATUS_META[status] || STATUS_META.pending;
  const avatarColor = hashColor(name);

  const runMark = async (nextStatus) => {
    if (!onMark || busy) return;
    setBusy(true);
    try {
      await onMark(kpi.employeeId, nextStatus);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="kc-card">
      <div className="kc-header">
        <div
          className="kc-avatar"
          style={{
            background: `color-mix(in srgb, ${avatarColor} 16%, transparent)`,
            color: avatarColor,
            border: `1px solid color-mix(in srgb, ${avatarColor} 40%, transparent)`,
          }}
        >
          {initials(name)}
        </div>
        <div className="kc-identity">
          <div className="kc-name">{name}</div>
          <div className="kc-email mono">{email}</div>
        </div>
        <span
          className="kc-status-pill"
          style={{ color: meta.color, background: meta.bg, border: `1px solid ${meta.border}` }}
        >
          {meta.label}
        </span>
      </div>

      <div className="kc-headline">
        <div className="kc-headline-item">
          <div className="kc-headline-value mono" title={exactMoney(target)}>
            {exactMoney(target)}
          </div>
          <div className="kc-headline-label">Target</div>
        </div>
        <div className="kc-divider" />
        <div className="kc-headline-item">
          <div className="kc-headline-value mono" title={exactMoney(achieved)}>
            {exactMoney(achieved)}
          </div>
          <div className="kc-headline-label">Achieved</div>
        </div>
        <div className="kc-divider" />
        <div className="kc-headline-item">
          <div className="kc-headline-value mono">{taskCount}</div>
          <div className="kc-headline-label">Delivered</div>
        </div>
      </div>

      <div className="kc-progress-wrap">
        <div className="kc-progress-track">
          <div
            className="kc-progress-fill"
            style={{ width: `${progressPct}%`, background: passed ? 'var(--status-delivered)' : 'var(--accent-cyan)' }}
          />
        </div>
        <div className="kc-progress-caption">
          <span style={{ color: passed ? 'var(--status-delivered)' : 'var(--text-secondary)' }}>
            {passed ? 'Target achieved' : `${exactMoney(remaining)} to go`}
          </span>
          <span className="mono">{Math.round(progressPct)}%</span>
        </div>
      </div>

      <div className={`kc-bonus-panel${bonusAmount > 0 ? ' kc-bonus-panel-active' : ''}`}>
        {bonusAmount > 0 ? (
          <>
            <div className="kc-bonus-amount mono">{exactBDT(bonusAmount)}</div>
            <div className="kc-bonus-caption">
              performance bonus · {exactMoney(excess)} above target
            </div>
          </>
        ) : (
          <div className="kc-bonus-caption kc-bonus-caption-muted">
            {passed ? 'At target — no excess earned yet' : 'No bonus until the minimum target is passed'}
          </div>
        )}
      </div>

      {isAdmin && (
        <div className="kc-actions">
          {status === 'pending' && (
            <button type="button" className="kc-btn kc-btn-primary" disabled={busy} onClick={() => runMark('approved')}>
              {busy ? 'Working…' : 'Approve'}
            </button>
          )}
          {status === 'approved' && (
            <>
              <button type="button" className="kc-btn kc-btn-primary" disabled={busy} onClick={() => runMark('paid')}>
                {busy ? 'Working…' : 'Mark Paid'}
              </button>
              <button type="button" className="kc-btn" disabled={busy} onClick={() => runMark('pending')}>
                Reopen
              </button>
            </>
          )}
          {status === 'paid' && (
            <>
              {kpi.paidOn && (
                <span className="kc-paid-note">Paid {new Date(kpi.paidOn).toLocaleDateString()}</span>
              )}
              <button type="button" className="kc-btn" disabled={busy} onClick={() => runMark('pending')}>
                Reopen
              </button>
            </>
          )}
        </div>
      )}

      <style>{`
        .kc-card {
          background: var(--bg-panel);
          border: 1px solid var(--border-hairline-soft);
          border-radius: var(--radius-lg);
          padding: 18px 20px 20px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          min-width: 0;
          transition: transform 0.15s ease, border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
        }
        .kc-card:hover {
          transform: translateY(-2px);
          border-color: var(--border-hairline);
          background: var(--bg-panel-raised);
          box-shadow: var(--shadow-card-hover);
        }
        [data-theme='light'] .kc-card:hover {
          background: var(--bg-panel);
        }
        .kc-header {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }
        .kc-avatar {
          flex-shrink: 0;
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-mono);
          font-size: 14px;
          font-weight: 700;
        }
        .kc-identity {
          min-width: 0;
          flex: 1;
        }
        .kc-name {
          font-size: 14.5px;
          font-weight: 700;
          color: var(--text-primary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .kc-email {
          font-size: 11.5px;
          color: var(--text-muted);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          margin-top: 1px;
        }
        .kc-status-pill {
          flex-shrink: 0;
          font-size: 10.5px;
          font-weight: 700;
          padding: 4px 9px;
          border-radius: 999px;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .kc-headline {
          display: flex;
          align-items: center;
          background: var(--bg-inset);
          border: 1px solid var(--border-hairline-soft);
          border-radius: 10px;
          padding: 12px 8px;
        }
        .kc-headline-item {
          flex: 1;
          text-align: center;
          min-width: 0;
        }
        .kc-headline-value {
          font-size: 16.5px;
          font-weight: 700;
          color: var(--text-primary);
          line-height: 1.15;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .kc-headline-label {
          font-size: 10px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.04em;
          margin-top: 2px;
        }
        .kc-divider {
          width: 1px;
          align-self: stretch;
          background: var(--border-hairline-soft);
          flex-shrink: 0;
        }
        .kc-progress-wrap {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .kc-progress-track {
          width: 100%;
          height: 6px;
          border-radius: 999px;
          background: var(--bg-inset);
          overflow: hidden;
        }
        .kc-progress-fill {
          height: 100%;
          border-radius: 999px;
          transition: width 0.2s ease;
        }
        .kc-progress-caption {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 8px;
          font-size: 11px;
          color: var(--text-muted);
        }
        .kc-bonus-panel {
          border-radius: 10px;
          padding: 12px 14px;
          background: var(--bg-inset);
          border: 1px solid var(--border-hairline-soft);
          text-align: center;
        }
        .kc-bonus-panel-active {
          background: linear-gradient(135deg, var(--chip-urgent-bg), var(--bg-panel));
          border-color: var(--chip-urgent-border);
        }
        .kc-bonus-amount {
          font-size: 22px;
          font-weight: 800;
          color: var(--text-warning);
        }
        .kc-bonus-caption {
          font-size: 11.5px;
          color: var(--text-secondary);
          margin-top: 2px;
        }
        .kc-bonus-caption-muted {
          margin-top: 0;
          color: var(--text-muted);
        }
        .kc-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .kc-btn {
          font-size: 12.5px;
          font-weight: 700;
          padding: 7px 14px;
          border-radius: 8px;
          background: var(--bg-inset);
          border: 1px solid var(--border-hairline);
          color: var(--text-secondary);
        }
        .kc-btn:hover:not(:disabled) {
          color: var(--text-primary);
          border-color: var(--accent-cyan);
        }
        .kc-btn:disabled {
          opacity: 0.6;
          cursor: default;
        }
        .kc-btn-primary {
          background: var(--accent-cyan);
          border-color: var(--accent-cyan);
          color: var(--text-on-accent);
        }
        .kc-btn-primary:hover:not(:disabled) {
          color: var(--text-on-accent);
          filter: brightness(1.08);
        }
        .kc-paid-note {
          font-size: 11.5px;
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
}
