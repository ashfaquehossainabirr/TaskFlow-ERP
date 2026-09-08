import { ListTodo, Loader2, PauseCircle, CheckCircle2, XCircle } from 'lucide-react';
import { formatCount, exactCount } from '../utils/formatCount';

const CARDS = [
  {
    key: 'todo',
    label: 'To Do',
    color: 'var(--status-todo)',
    icon: ListTodo,
  },
  {
    key: 'in-progress',
    label: 'In Progress',
    color: 'var(--status-progress)',
    icon: Loader2,
  },
  {
    key: 'hold',
    label: 'On Hold',
    color: 'var(--status-hold)',
    icon: PauseCircle,
  },
  {
    key: 'delivered',
    label: 'Delivered',
    color: 'var(--status-delivered)',
    icon: CheckCircle2,
  },
  {
    key: 'cancelled',
    label: 'Cancelled',
    color: 'var(--status-cancelled)',
    icon: XCircle,
  },
];

export default function StatsCards({ stats, loading, onCardClick }) {
  return (
    <div className="stat-cards-grid">
      <style>{`
        .stat-cards-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 16px;
          margin-bottom: 28px;
        }
        /* Laptop */
        @media (max-width: 1200px) {
          .stat-cards-grid {
            gap: 14px;
          }
        }
        /* Tablet */
        @media (max-width: 900px) {
          .stat-cards-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
          }
        }
        /* Mobile */
        @media (max-width: 560px) {
          .stat-cards-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
          }
        }

        .stat-card {
          display: flex;
          flex-direction: column;
          transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
        }
        .stat-card:hover {
          transform: translateY(-3px);
          background: var(--bg-panel-raised);
          border-color: var(--glow);
          box-shadow: 0 10px 24px -8px var(--glow), 0 0 0 1px var(--glow) inset;
        }
        .stat-card:hover .stat-card-bar {
          width: 5px;
          box-shadow: 0 0 12px var(--glow);
        }
        .stat-card:hover .stat-card-value {
          color: var(--glow);
        }
        .stat-card:hover .stat-card-icon-chip {
          background: var(--glow);
          color: var(--text-on-accent);
        }
        @media (prefers-reduced-motion: reduce) {
          .stat-card { transition: none; }
          .stat-card:hover { transform: none; }
        }

        .stat-card-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 16px;
        }
        .stat-card-label {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.04em;
          line-height: 1.3;
          padding-top: 2px;
        }
        .stat-card-icon-chip {
          width: 34px;
          height: 34px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          background: color-mix(in srgb, var(--glow) 16%, transparent);
          color: var(--glow);
          flex-shrink: 0;
          transition: background 0.18s ease, color 0.18s ease;
        }
        .stat-card-value {
          font-size: 30px;
          font-weight: 600;
          color: var(--text-primary);
          line-height: 1.1;
          transition: color 0.18s ease;
        }

        /* Laptop */
        @media (max-width: 1200px) {
          .stat-card { padding: 16px 16px 14px; }
          .stat-card-value { font-size: 26px; }
        }
        /* Tablet */
        @media (max-width: 900px) {
          .stat-card { padding: 15px 15px 13px; }
          .stat-card-head { margin-bottom: 14px; }
          .stat-card-icon-chip { width: 30px; height: 30px; }
          .stat-card-value { font-size: 24px; }
        }
        /* Mobile */
        @media (max-width: 560px) {
          .stat-card { padding: 13px 13px 12px; }
          .stat-card-head { margin-bottom: 10px; }
          .stat-card-label { font-size: 10.5px; }
          .stat-card-icon-chip { width: 26px; height: 26px; border-radius: var(--radius-sm); }
          .stat-card-value { font-size: 20px; }
        }
        @media (max-width: 380px) {
          .stat-cards-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
      {CARDS.map((c) => {
        const Icon = c.icon;
        return (
          <div
            key={c.key}
            className="stat-card"
            onClick={() => onCardClick && onCardClick(c.key, c.label)}
            style={{
              background: 'var(--bg-panel)',
              border: '1px solid var(--border-hairline-soft)',
              borderRadius: 'var(--radius-lg)',
              padding: '18px 18px 16px',
              position: 'relative',
              overflow: 'hidden',
              cursor: onCardClick ? 'pointer' : 'default',
              '--glow': c.color,
            }}
          >
            <div
              className="stat-card-bar"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: 3,
                height: '100%',
                background: c.color,
                transition: 'width 0.18s ease, box-shadow 0.18s ease',
              }}
            />
            <div className="stat-card-head">
              <div className="stat-card-label">{c.label}</div>
              <div className="stat-card-icon-chip">
                <Icon size={17} strokeWidth={2.25} />
              </div>
            </div>
            <div
              className="mono stat-card-value"
              title={loading ? undefined : exactCount(stats?.[c.key] ?? 0)}
            >
              {loading ? '—' : formatCount(stats?.[c.key] ?? 0)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
