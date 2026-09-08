import { formatMoney, exactMoney } from '../utils/currency';
import { formatCount, exactCount } from '../utils/formatCount';

const MINI_STATS = [
  {
    key: 'todo',
    label: 'To Do',
    color: 'var(--status-todo)',
  },
  {
    key: 'in-progress',
    label: 'In Progress',
    color: 'var(--status-progress)',
  },
  {
    key: 'hold',
    label: 'On Hold',
    color: 'var(--status-hold)',
  },
  {
    key: 'delivered',
    label: 'Delivered',
    color: 'var(--status-delivered)',
  },
  {
    key: 'cancelled',
    label: 'Cancelled',
    color: 'var(--status-cancelled)',
  },
];

const AVATAR_PALETTE = [
  'var(--accent-cyan)',
  'var(--status-progress)',
  'var(--status-hold)',
  'var(--status-delivered)',
  'var(--status-cancelled)',
];

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

export default function EmployeeStatCard({ employee, onClick }) {
  const hasTarget = employee.minimumTarget !== null && employee.minimumTarget !== undefined;
  const deliveredValue = Number(employee.deliveredValue ?? 0);
  const target = hasTarget ? Number(employee.minimumTarget) : 0;
  const remaining = hasTarget ? target - deliveredValue : 0;
  const achieved = hasTarget && remaining <= 0;
  const progressPct = hasTarget && target > 0 ? Math.min(100, (deliveredValue / target) * 100) : 0;
  const total = MINI_STATS.reduce((sum, s) => sum + Number(employee[s.key] ?? 0), 0);
  const avatarColor = hashColor(employee.name);
  
  return (
    <div onClick={onClick} className="employee-stat-card">
      <div className="esc-header">
        <div
          className="esc-avatar"
          style={{
            background: `color-mix(in srgb, ${avatarColor} 16%, transparent)`,
            color: avatarColor,
            border: `1px solid color-mix(in srgb, ${avatarColor} 40%, transparent)`,
          }}
        >
          {initials(employee.name)}
        </div>
        <div className="esc-identity">
          <div className="esc-name">{employee.name}</div>
          <div className="esc-email mono">{employee.email}</div>
        </div>
        {employee.department && <div className="esc-dept">{employee.department}</div>}
      </div>

      <div className="esc-headline">
        <div className="esc-headline-item">
          <div
            className="esc-headline-value mono"
            title={exactCount(employee.projects)}
            style={{
              color: 'var(--accent-cyan)',
            }}
          >
            {formatCount(employee.projects)}
          </div>
          <div className="esc-headline-label">Projects</div>
        </div>
        <div className="esc-divider" />
        <div className="esc-headline-item">
          <div className="esc-headline-value mono" title={exactCount(total)}>{formatCount(total)}</div>
          <div className="esc-headline-label">Tasks</div>
        </div>
        {hasTarget && (
          <>
            <div className="esc-divider" />
            <div className="esc-headline-item">
              <div className="esc-headline-value mono" title={exactMoney(target)}>
                ${formatMoney(target)}
              </div>
              <div className="esc-headline-label">Min. Target</div>
            </div>
          </>
        )}
      </div>

      <div className="esc-section">
        <div className="esc-section-title">Task Status</div>
        {total > 0 && (
          <div className="esc-status-bar">
            {MINI_STATS.filter((s) => Number(employee[s.key] ?? 0) > 0).map((s) => (
              <div
                key={s.key}
                style={{
                  width: `${(Number(employee[s.key] ?? 0) / total) * 100}%`,
                  background: s.color,
                }}
                title={`${s.label}: ${employee[s.key]}`}
              />
            ))}
          </div>
        )}
        <div className="esc-status-grid">
          {MINI_STATS.map((s) => (
            <div key={s.key} className="esc-status-item">
              <span
                className="esc-dot"
                style={{
                  background: s.color,
                }}
              />
              <span className="esc-status-count mono" title={exactCount(employee[s.key] ?? 0)}>
                {formatCount(employee[s.key] ?? 0)}
              </span>
              <span className="esc-status-label">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="esc-section">
        <div className="esc-section-title">Value Delivered</div>
        <div className="esc-value-grid">
          <div className="esc-value-item">
            <div
              className="esc-value-amount mono"
              style={{
                color: 'var(--status-progress)',
              }}
              title={exactMoney(employee.inProgressValue ?? 0)}
            >
              ${formatMoney(employee.inProgressValue ?? 0)}
            </div>
            <div className="esc-value-label">In Progress</div>
          </div>
          <div className="esc-value-item">
            <div
              className="esc-value-amount mono"
              style={{
                color: 'var(--status-delivered)',
              }}
              title={exactMoney(deliveredValue)}
            >
              ${formatMoney(deliveredValue)}
            </div>
            <div className="esc-value-label">Delivered</div>
          </div>
        </div>

        {hasTarget && (
          <div className="esc-progress-wrap">
            <div className="esc-progress-track">
              <div
                className="esc-progress-fill"
                style={{
                  width: `${progressPct}%`,
                  background: achieved ? 'var(--status-delivered)' : 'var(--accent-cyan)',
                }}
              />
            </div>
            <div className="esc-progress-caption">
              <span
                className="esc-progress-remaining"
                style={{
                  color: achieved ? 'var(--status-delivered)' : 'var(--text-secondary)',
                }}
                title={achieved ? undefined : exactMoney(remaining)}
              >
                {achieved ? 'Target achieved' : `$${formatMoney(remaining)} remaining`}
              </span>
              <span className="mono">{Math.round(progressPct)}%</span>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .employee-stat-card {
          background: var(--bg-panel);
          border: 1px solid var(--border-hairline-soft);
          border-radius: var(--radius-lg);
          padding: 18px 20px 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          min-width: 0;
          cursor: ${onClick ? 'pointer' : 'default'};
          transition: transform 0.15s ease, border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
        }
        .employee-stat-card:hover {
          transform: translateY(-2px);
          border-color: var(--border-hairline);
          background: var(--bg-panel-raised);
          box-shadow: var(--shadow-card-hover);
        }
        [data-theme='light'] .employee-stat-card:hover {
          background: var(--bg-panel);
        }

        .esc-header {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }
        .esc-avatar {
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
        .esc-identity {
          min-width: 0;
          flex: 1;
        }
        .esc-name {
          font-size: 14.5px;
          font-weight: 700;
          color: var(--text-primary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .esc-email {
          font-size: 11.5px;
          color: var(--text-muted);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          margin-top: 1px;
        }
        .esc-dept {
          flex-shrink: 0;
          font-size: 10.5px;
          font-weight: 600;
          color: var(--text-secondary);
          background: var(--bg-inset);
          border: 1px solid var(--border-hairline-soft);
          padding: 4px 9px;
          border-radius: 999px;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          max-width: 40%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .esc-headline {
          display: flex;
          align-items: center;
          background: var(--bg-inset);
          border: 1px solid var(--border-hairline-soft);
          border-radius: 10px;
          padding: 12px 8px;
        }
        .esc-headline-item {
          flex: 1;
          text-align: center;
          min-width: 0;
        }
        .esc-headline-value {
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary);
          line-height: 1.15;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .esc-headline-label {
          font-size: 10px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.04em;
          margin-top: 2px;
        }
        .esc-divider {
          width: 1px;
          align-self: stretch;
          background: var(--border-hairline-soft);
          flex-shrink: 0;
        }

        .esc-section {
          display: flex;
          flex-direction: column;
          gap: 9px;
        }
        .esc-section-title {
          font-size: 10.5px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .esc-status-bar {
          display: flex;
          width: 100%;
          height: 6px;
          border-radius: 999px;
          overflow: hidden;
          background: var(--bg-inset);
        }
        .esc-status-bar > div {
          transition: width 0.2s ease;
        }

        .esc-status-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(96px, 1fr));
          gap: 6px 10px;
        }
        .esc-status-item {
          display: flex;
          align-items: center;
          gap: 6px;
          min-width: 0;
        }
        .esc-dot {
          width: 7px;
          height: 7px;
          border-radius: 999px;
          flex-shrink: 0;
        }
        .esc-status-count {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
          flex-shrink: 0;
        }
        .esc-status-label {
          font-size: 11.5px;
          color: var(--text-muted);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .esc-value-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
        }
        .esc-value-item {
          background: var(--bg-inset);
          border: 1px solid var(--border-hairline-soft);
          border-radius: 8px;
          padding: 8px 10px;
          min-width: 0;
        }
        .esc-value-amount {
          font-size: 15.5px;
          font-weight: 700;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 100%;
        }
        .esc-value-label {
          font-size: 10.5px;
          color: var(--text-muted);
          margin-top: 2px;
        }

        .esc-progress-wrap {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .esc-progress-track {
          width: 100%;
          height: 6px;
          border-radius: 999px;
          background: var(--bg-inset);
          overflow: hidden;
        }
        .esc-progress-fill {
          height: 100%;
          border-radius: 999px;
          transition: width 0.2s ease;
        }
        .esc-progress-caption {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 8px;
          font-size: 11px;
          color: var(--text-muted);
        }
        .esc-progress-remaining {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      `}</style>
    </div>
  );
}
