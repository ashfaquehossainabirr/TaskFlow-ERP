import StatusBadge from './StatusBadge';
import DeadlineChip from './DeadlineChip';
import { STATUS_LABELS } from '../utils/deadline';
import { formatMoney, exactMoney } from '../utils/currency';

const STATUS_OPTIONS = Object.keys(STATUS_LABELS);

const thStyle = {
  textAlign: 'left',
  padding: '10px 16px',
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  borderBottom: '1px solid var(--border-hairline-soft)',
};

const tdStyle = {
  padding: '14px 16px',
  fontSize: 13.5,
  color: 'var(--text-primary)',
  borderBottom: '1px solid var(--border-hairline-soft)',
  verticalAlign: 'middle',
};

export default function TaskTable({
  tasks,
  isAdmin,
  onStatusChange,
  onEdit,
  onDelete,
  deletingId,
  onRowClick,
  emptyLabel,
  showActions = true,
}) {
  if (!tasks || tasks.length === 0) {
    return (
      <div
        style={{
          border: '1px dashed var(--border-hairline)',
          borderRadius: 'var(--radius-lg)',
          padding: '48px 24px',
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: 14,
        }}
      >
        {emptyLabel || 'No tasks to show yet.'}
      </div>
    );
  }
  
  return (
    <div
      style={{
        background: 'var(--bg-panel)',
        border: '1px solid var(--border-hairline-soft)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        padding: '10px',
      }}
    >
      <style>{`
        .task-row:hover td .taskTitle { color: var(--accent-cyan); transition: color 0.2s ease; }
        .task-row:hover td .projectName { color: var(--accent-cyan) !important; transition: color 0.2s ease; }
      `}</style>
      <div
        style={{
          overflowX: 'auto',
          maxHeight: '500px',
          overflowY: 'auto',
          paddingRight: '6px',
          paddingBottom: '6px',
        }}
      >
        <table
          style={{
            width: '100%',
            minWidth: 1425,
            borderCollapse: 'collapse',
          }}
        >
          <thead
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 1,
              background: 'var(--bg-panel)',
              paddingTop: '6px',
            }}
          >
            <tr>
              <th style={thStyle}>Task</th>
              <th style={thStyle}>Project</th>
              <th
                style={{
                  ...thStyle,
                  maxWidth: 140,
                }}
              >
                Project Value
              </th>
              {isAdmin && <th style={thStyle}>Assigned To</th>}
              <th style={thStyle}>Priority</th>
              <th style={thStyle}>Deadline</th>
              <th style={thStyle}>Status</th>
              {isAdmin && showActions && <th style={thStyle}></th>}
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr
                key={task._id}
                onClick={() => onRowClick && onRowClick(task)}
                style={
                  onRowClick
                    ? {
                        cursor: 'pointer',
                      }
                    : undefined
                }
                className={onRowClick ? 'task-row' : undefined}
              >
                <td style={tdStyle}>
                  <div
                    style={{
                      fontWeight: 600,
                    }}
                    className="taskTitle"
                  >
                    {task.title}
                  </div>
                  {task.description && (
                    <div
                      style={{
                        color: 'var(--text-muted)',
                        fontSize: 12.5,
                        marginTop: 3,
                        maxWidth: 280,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {task.description}
                    </div>
                  )}
                </td>
                <td style={tdStyle}>
                  <span
                    className="mono projectName"
                    style={{
                      fontSize: 12.5,
                      color: 'var(--text-secondary)',
                      background: 'var(--bg-inset)',
                      padding: '3px 8px',
                      borderRadius: 5,
                      border: '1px solid var(--border-hairline)',
                    }}
                  >
                    {task.project?.name || '—'}
                  </span>
                </td>
                <td
                  style={{
                    ...tdStyle,
                    maxWidth: 140,
                  }}
                >
                  {task.projectValue !== null && task.projectValue !== undefined ? (
                    <span
                      className="mono"
                      title={exactMoney(task.projectValue)}
                      style={{
                        fontSize: 13,
                        color: 'var(--text-primary)',
                        display: 'inline-block',
                        maxWidth: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      ${formatMoney(task.projectValue)}
                    </span>
                  ) : (
                    <span
                      style={{
                        color: 'var(--text-muted)',
                      }}
                    >
                      —
                    </span>
                  )}
                </td>
                {isAdmin && (
                  <td style={tdStyle}>
                    <div
                      style={{
                        fontSize: 13,
                      }}
                    >
                      {task.assignedTo?.name || '—'}
                    </div>
                    <div
                      style={{
                        fontSize: 11.5,
                        color: 'var(--text-muted)',
                      }}
                    >
                      {task.assignedTo?.department}
                    </div>
                  </td>
                )}
                <td style={tdStyle}>
                  <PriorityTag priority={task.priority} />
                </td>
                <td style={tdStyle}>
                  <DeadlineChip deadline={task.deadline} status={task.status} />
                </td>
                <td style={tdStyle} onClick={(e) => e.stopPropagation()}>
                  {onStatusChange ? (
                    <select
                      value={task.status}
                      onChange={(e) => onStatusChange(task, e.target.value)}
                      style={{
                        background: 'var(--bg-inset)',
                        border: '1px solid var(--border-hairline)',
                        color: 'var(--text-primary)',
                        borderRadius: 6,
                        padding: '6px 8px',
                        fontSize: 12.5,
                        fontFamily: 'inherit',
                      }}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <StatusBadge status={task.status} />
                  )}
                </td>
                {isAdmin && showActions && (
                  <td style={tdStyle} onClick={(e) => e.stopPropagation()}>
                    <div
                      style={{
                        display: 'flex',
                        gap: 8,
                      }}
                    >
                      <button onClick={() => onEdit(task)} style={iconBtnStyle}>
                        Edit
                      </button>
                      <button
                        onClick={() => onDelete(task)}
                        disabled={deletingId === task._id}
                        style={{
                          ...iconBtnStyle,
                          color: 'var(--status-cancelled)',
                          opacity: deletingId === task._id ? 0.6 : 1,
                          cursor: deletingId === task._id ? 'default' : 'pointer',
                        }}
                      >
                        {deletingId === task._id ? 'Deleting…' : 'Delete'}
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
const iconBtnStyle = {
  background: 'transparent',
  border: '1px solid var(--border-hairline)',
  color: 'var(--text-secondary)',
  borderRadius: 6,
  padding: '5px 10px',
  fontSize: 12,
  cursor: 'pointer',
};
function PriorityTag({ priority }) {
  const colors = {
    low: 'var(--text-muted)',
    medium: 'var(--text-info)',
    high: 'var(--text-warning)',
    urgent: 'var(--text-error)',
  };
  return (
    <span
      style={{
        fontSize: 12,
        fontWeight: 600,
        color: colors[priority] || 'var(--text-secondary)',
        textTransform: 'capitalize',
      }}
    >
      {priority}
    </span>
  );
}
