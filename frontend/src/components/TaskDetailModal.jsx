import { useEffect, useState } from 'react';
import Modal from './Modal';
import ConfirmModal from './ConfirmModal';
import StatusBadge from './StatusBadge';
import DeadlineChip from './DeadlineChip';
import Spinner from './Spinner';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useTimer } from '../context/TimerContext';
import { daysRemaining } from '../utils/deadline';
import { formatStopwatch, formatDurationShort } from '../utils/time';
import { formatMoney, exactMoney } from '../utils/currency';

const row = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 16,
  padding: '11px 0',
  borderBottom: '1px solid var(--border-hairline-soft)',
};

const rowLabel = {
  fontSize: 12.5,
  color: 'var(--text-muted)',
  fontWeight: 600,
  flexShrink: 0,
};

const rowValue = {
  fontSize: 13.5,
  color: 'var(--text-primary)',
  textAlign: 'right',
  wordBreak: 'break-word',
  minWidth: 0,
};

export default function TaskDetailModal({ taskId, onClose }) {
  const { user } = useAuth();
  const { activeEntry, elapsedSeconds, startTimer, stopTimer } = useTimer();
  const [task, setTask] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [activity, setActivity] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [posting, setPosting] = useState(false);
  const [confirmDeleteTimeEntry, setConfirmDeleteTimeEntry] = useState(null);
  const [confirmDeleteComment, setConfirmDeleteComment] = useState(null);
  const [commentError, setCommentError] = useState('');
  const [timeEntries, setTimeEntries] = useState([]);
  const [timeError, setTimeError] = useState('');
  const [timerBusy, setTimerBusy] = useState(false);

  const loadActivity = () => {
    setActivityLoading(true);
    return api
      .get(`/tasks/${taskId}/activity`)
      .then((res) => setActivity(res.data))
      .catch(() => {})
      .finally(() => setActivityLoading(false));
  };

  const loadTimeEntries = () => {
    return api
      .get('/time-entries', {
        params: {
          task: taskId,
        },
      })
      .then((res) => setTimeEntries(res.data))
      .catch(() => {});
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    api
      .get(`/tasks/${taskId}`)
      .then((res) => {
        if (!cancelled) setTask(res.data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.message || 'Failed to load task details.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    loadActivity();
    loadTimeEntries();

    return () => {
      cancelled = true;
    };
  }, [taskId]);

  const isThisTaskActive = Boolean(activeEntry && String(activeEntry.task?._id) === String(taskId));
  const isOtherTaskActive = Boolean(activeEntry && !isThisTaskActive);
  const loggedSeconds = timeEntries.reduce((sum, e) => sum + (e.durationSeconds || 0), 0);
  const totalSeconds = loggedSeconds + (isThisTaskActive ? elapsedSeconds : 0);

  const handleStartTimer = async () => {
    setTimeError('');
    setTimerBusy(true);
    try {
      await startTimer(taskId);
    } catch (err) {
      setTimeError(err.response?.data?.message || 'Failed to start timer.');
    } finally {
      setTimerBusy(false);
    }
  };

  const handleStopTimer = async () => {
    setTimerBusy(true);
    try {
      await stopTimer();
      await Promise.all([loadTimeEntries(), loadActivity()]);
    } catch (err) {
      setTimeError(err.response?.data?.message || 'Failed to stop timer.');
    } finally {
      setTimerBusy(false);
    }
  };

  const handleDeleteTimeEntry = (entryId) => setConfirmDeleteTimeEntry(entryId);

  const performDeleteTimeEntry = async () => {
    const entryId = confirmDeleteTimeEntry;
    const prev = timeEntries;
    setTimeEntries((list) => list.filter((e) => e._id !== entryId));
    try {
      await api.delete(`/time-entries/${entryId}`);
    } catch (err) {
      setTimeEntries(prev);
      alert(err.response?.data?.message || 'Failed to delete time entry.');
    } finally {
      setConfirmDeleteTimeEntry(null);
    }
  };

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setCommentError('');
    setPosting(true);
    try {
      const res = await api.post(`/tasks/${taskId}/comments`, {
        text: commentText.trim(),
      });
      setActivity((prev) => [...prev, res.data]);
      setCommentText('');
    } catch (err) {
      setCommentError(err.response?.data?.message || 'Failed to post comment.');
    } finally {
      setPosting(false);
    }
  };

  const handleDeleteComment = (commentId) => setConfirmDeleteComment(commentId);

  const performDeleteComment = async () => {
    const commentId = confirmDeleteComment;
    const prev = activity;
    setActivity((list) => list.filter((a) => a._id !== commentId));
    try {
      await api.delete(`/tasks/${taskId}/comments/${commentId}`);
    } catch (err) {
      setActivity(prev);
      alert(err.response?.data?.message || 'Failed to delete comment.');
    } finally {
      setConfirmDeleteComment(null);
    }
  };
  
  return (
    <>
      <Modal title={loading ? 'Loading task…' : task?.title || 'Task details'} onClose={onClose} width={560}>
      {loading && (
        <div style={{ padding: '32px 0' }}>
          <Spinner label="Loading task…" />
        </div>
      )}

      {error && (
        <div
          style={{
            background: 'rgba(239, 100, 97, 0.1)',
            border: '1px solid rgba(239, 100, 97, 0.35)',
            color: 'var(--text-error)',
            padding: '10px 12px',
            borderRadius: 8,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {!loading && task && (
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 18,
              flexWrap: 'wrap',
            }}
          >
            <StatusBadge status={task.status} />
            <DeadlineChip deadline={task.deadline} status={task.status} />
            <PriorityPill priority={task.priority} />
          </div>

          {task.description && (
            <div
              style={{
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  ...rowLabel,
                  marginBottom: 6,
                }}
              >
                Description
              </div>
              <p
                style={{
                  fontSize: 13.5,
                  color: 'var(--text-primary)',
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                {task.description}
              </p>
            </div>
          )}

          <div
            style={{
              marginBottom: 22,
            }}
          >
            <div style={row}>
              <span style={rowLabel}>Project</span>
              <span
                style={{
                  ...rowValue,
                }}
                className="mono"
              >
                {task.project?.name || '—'}
              </span>
            </div>
            {task.projectValue !== null && task.projectValue !== undefined && (
              <div style={row}>
                <span style={rowLabel}>Project value</span>
                <span style={rowValue} className="mono" title={exactMoney(task.projectValue)}>
                  ${formatMoney(task.projectValue)}
                </span>
              </div>
            )}
            {task.milestone && (
              <div style={row}>
                <span style={rowLabel}>Milestone</span>
                <span style={rowValue}>
                  {task.project?.milestones?.find((m) => m._id === task.milestone)?.title || '—'}
                </span>
              </div>
            )}
            <div style={row}>
              <span style={rowLabel}>Assigned to</span>
              <span style={rowValue}>
                {task.assignedTo?.name || '—'}
                {task.assignedTo?.department ? ` · ${task.assignedTo.department}` : ''}
              </span>
            </div>
            <div style={row}>
              <span style={rowLabel}>Assignee email</span>
              <span style={rowValue} className="mono">
                {task.assignedTo?.email || '—'}
              </span>
            </div>
            <div style={row}>
              <span style={rowLabel}>Created by</span>
              <span style={rowValue}>{task.createdBy?.name || '—'}</span>
            </div>
            <div style={row}>
              <span style={rowLabel}>Deadline</span>
              <span style={rowValue}>
                {new Date(task.deadline).toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
                {' · '}
                {formatDaysAbsolute(task.deadline)}
              </span>
            </div>
            <div style={row}>
              <span style={rowLabel}>Created</span>
              <span style={rowValue}>{new Date(task.createdAt).toLocaleDateString()}</span>
            </div>
            <div
              style={{
                ...row,
                borderBottom: 'none',
              }}
            >
              <span style={rowLabel}>Last updated</span>
              <span style={rowValue}>{new Date(task.updatedAt).toLocaleString()}</span>
            </div>
          </div>

          <div
            style={{
              marginBottom: 22,
            }}
          >
            <div
              style={{
                ...rowLabel,
                marginBottom: 10,
              }}
            >
              Time tracking
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 10,
                flexWrap: 'wrap',
                gap: 10,
              }}
            >
              <span
                className="mono"
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: isThisTaskActive ? 'var(--accent-cyan)' : 'var(--text-primary)',
                }}
              >
                {formatStopwatch(totalSeconds)}
              </span>
              {isThisTaskActive ? (
                <button
                  onClick={handleStopTimer}
                  disabled={timerBusy}
                  style={{
                    background: 'var(--status-cancelled)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '8px 16px',
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: timerBusy ? 'default' : 'pointer',
                    opacity: timerBusy ? 0.6 : 1,
                  }}
                >
                  {timerBusy ? 'Stopping…' : 'Stop timer'}
                </button>
              ) : (
                <button
                  onClick={handleStartTimer}
                  disabled={timerBusy || isOtherTaskActive}
                  title={isOtherTaskActive ? 'Stop your other running timer first' : undefined}
                  style={{
                    background: isOtherTaskActive ? 'var(--bg-inset)' : 'var(--accent-cyan)',
                    color: isOtherTaskActive ? 'var(--text-muted)' : 'var(--text-on-accent)',
                    border: isOtherTaskActive ? '1px solid var(--border-hairline)' : 'none',
                    borderRadius: 8,
                    padding: '8px 16px',
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: timerBusy || isOtherTaskActive ? 'default' : 'pointer',
                  }}
                >
                  {isOtherTaskActive ? 'Timer running elsewhere' : timerBusy ? 'Starting…' : 'Start timer'}
                </button>
              )}
            </div>

            {timeError && (
              <div
                style={{
                  background: 'rgba(239, 100, 97, 0.1)',
                  border: '1px solid rgba(239, 100, 97, 0.35)',
                  color: 'var(--text-error)',
                  padding: '8px 10px',
                  borderRadius: 8,
                  fontSize: 12.5,
                  marginBottom: 10,
                }}
              >
                {timeError}
              </div>
            )}

            {timeEntries.filter((e) => e.endTime).length > 0 && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                {timeEntries
                  .filter((e) => e.endTime)
                  .map((e) => (
                    <div
                      key={e._id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: 12,
                        color: 'var(--text-secondary)',
                        gap: 8,
                      }}
                    >
                      <span
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {e.user?.name || 'Someone'} · {new Date(e.startTime).toLocaleDateString()}
                      </span>
                      <span
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          flexShrink: 0,
                        }}
                      >
                        <span className="mono">{formatDurationShort(e.durationSeconds)}</span>
                        {(user.role === 'admin' || String(e.user?._id) === String(user._id)) && (
                          <button
                            onClick={() => handleDeleteTimeEntry(e._id)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--status-cancelled)',
                              fontSize: 11,
                              cursor: 'pointer',
                              padding: 0,
                            }}
                          >
                            Delete
                          </button>
                        )}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>

          <div>
            <div
              style={{
                ...rowLabel,
                marginBottom: 10,
              }}
            >
              Activity &amp; comments
            </div>

            {activityLoading && (
              <div style={{ padding: '8px 0' }}>
                <Spinner size="sm" inline label="Loading activity…" />
              </div>
            )}

            {!activityLoading && activity.length === 0 && (
              <div
                style={{
                  fontSize: 12.5,
                  color: 'var(--text-muted)',
                }}
              >
                No activity yet.
              </div>
            )}

            {!activityLoading && activity.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  marginBottom: 16,
                }}
              >
                {activity.map((a) =>
                  a.type === 'comment' ? (
                    <div
                      key={a._id}
                      style={{
                        background: 'var(--bg-inset)',
                        border: '1px solid var(--border-hairline-soft)',
                        borderRadius: 10,
                        padding: '10px 12px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 4,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 12.5,
                            fontWeight: 700,
                            color: 'var(--text-primary)',
                          }}
                        >
                          {a.user?.name || 'Unknown'}
                        </span>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                          }}
                        >
                          <span
                            className="mono"
                            style={{
                              fontSize: 11,
                              color: 'var(--text-muted)',
                            }}
                          >
                            {new Date(a.createdAt).toLocaleString()}
                          </span>
                          {(user.role === 'admin' || String(a.user?._id) === String(user._id)) && (
                            <button
                              onClick={() => handleDeleteComment(a._id)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--status-cancelled)',
                                fontSize: 11,
                                cursor: 'pointer',
                                padding: 0,
                              }}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          color: 'var(--text-primary)',
                          lineHeight: 1.5,
                        }}
                      >
                        {a.text}
                      </div>
                    </div>
                  ) : (
                    <div
                      key={a._id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                      }}
                    >
                      <div
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: 'var(--accent-cyan)',
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontSize: 12.5,
                          color: 'var(--text-secondary)',
                        }}
                      >
                        <strong
                          style={{
                            color: 'var(--text-primary)',
                          }}
                        >
                          {a.user?.name || 'Someone'}
                        </strong>{' '}
                        {a.message}
                      </span>
                      <span
                        className="mono"
                        style={{
                          fontSize: 11,
                          color: 'var(--text-muted)',
                          marginLeft: 'auto',
                          flexShrink: 0,
                        }}
                      >
                        {new Date(a.createdAt).toLocaleString()}
                      </span>
                    </div>
                  )
                )}
              </div>
            )}

            <form onSubmit={handlePostComment}>
              {commentError && (
                <div
                  style={{
                    background: 'rgba(239, 100, 97, 0.1)',
                    border: '1px solid rgba(239, 100, 97, 0.35)',
                    color: 'var(--text-error)',
                    padding: '8px 10px',
                    borderRadius: 8,
                    fontSize: 12.5,
                    marginBottom: 10,
                  }}
                >
                  {commentError}
                </div>
              )}
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment…"
                style={{
                  width: '100%',
                  minHeight: 56,
                  resize: 'vertical',
                  background: 'var(--bg-inset)',
                  border: '1px solid var(--border-hairline)',
                  borderRadius: 8,
                  padding: '9px 11px',
                  fontSize: 13,
                  color: 'var(--text-primary)',
                  fontFamily: 'inherit',
                }}
              />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  marginTop: 8,
                }}
              >
                <button
                  type="submit"
                  disabled={posting || !commentText.trim()}
                  style={{
                    background: 'var(--accent-cyan)',
                    color: 'var(--text-on-accent)',
                    border: 'none',
                    borderRadius: 8,
                    padding: '8px 16px',
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: posting ? 'default' : 'pointer',
                    opacity: posting || !commentText.trim() ? 0.6 : 1,
                  }}
                >
                  {posting ? 'Posting…' : 'Post comment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </Modal>

      {confirmDeleteTimeEntry && (
        <ConfirmModal
          title="Delete time entry"
          message="Delete this time entry? This cannot be undone."
          confirmLabel="Delete entry"
          onConfirm={performDeleteTimeEntry}
          onClose={() => setConfirmDeleteTimeEntry(null)}
        />
      )}

      {confirmDeleteComment && (
        <ConfirmModal
          title="Delete comment"
          message="Delete this comment? This cannot be undone."
          confirmLabel="Delete comment"
          onConfirm={performDeleteComment}
          onClose={() => setConfirmDeleteComment(null)}
        />
      )}
    </>
  );
}
function formatDaysAbsolute(deadline) {
  const days = daysRemaining(deadline);
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue`;
  if (days === 0) return 'Due today';
  return `${days} day${days === 1 ? '' : 's'} remaining`;
}
function PriorityPill({ priority }) {
  const colors = {
    low: 'var(--text-muted)',
    medium: 'var(--status-progress)',
    high: 'var(--status-hold)',
    urgent: 'var(--status-cancelled)',
  };
  return (
    <span
      style={{
        fontSize: 12,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        color: colors[priority] || 'var(--text-secondary)',
        border: `1px solid ${colors[priority] || 'var(--border-hairline)'}`,
        borderRadius: 999,
        padding: '4px 10px',
      }}
    >
      {priority} priority
    </span>
  );
}
