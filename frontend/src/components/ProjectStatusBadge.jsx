const PROJECT_STATUS_LABELS = {
  planning: 'Planning',
  active: 'Active',
  'on-hold': 'On Hold',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const PROJECT_STATUS_COLORS = {
  planning: 'var(--status-todo)',
  active: 'var(--status-progress)',
  'on-hold': 'var(--status-hold)',
  completed: 'var(--status-delivered)',
  cancelled: 'var(--status-cancelled)',
};

const MILESTONE_STATUS_LABELS = {
  pending: 'Pending',
  'in-progress': 'In Progress',
  completed: 'Completed',
};

const MILESTONE_STATUS_COLORS = {
  pending: 'var(--status-todo)',
  'in-progress': 'var(--status-progress)',
  completed: 'var(--status-delivered)',
};

export function ProjectStatusBadge({ status }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px 4px 8px',
        borderRadius: 999,
        background: 'var(--bg-inset)',
        border: '1px solid var(--border-hairline)',
        fontSize: 12,
        fontWeight: 600,
        color: 'var(--text-secondary)',
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: PROJECT_STATUS_COLORS[status] || 'var(--status-todo)',
          boxShadow: `0 0 8px ${PROJECT_STATUS_COLORS[status] || 'var(--status-todo)'}`,
        }}
      />
      {PROJECT_STATUS_LABELS[status] || status}
    </span>
  );
}
export function MilestoneStatusBadge({ status }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '3px 9px 3px 7px',
        borderRadius: 999,
        background: 'var(--bg-inset)',
        border: '1px solid var(--border-hairline)',
        fontSize: 11.5,
        fontWeight: 600,
        color: 'var(--text-secondary)',
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: MILESTONE_STATUS_COLORS[status] || 'var(--status-todo)',
        }}
      />
      {MILESTONE_STATUS_LABELS[status] || status}
    </span>
  );
}
export { PROJECT_STATUS_LABELS, MILESTONE_STATUS_LABELS };
