import { useTimer } from '../context/TimerContext';
import { formatStopwatch } from '../utils/time';

export default function ActiveTimerBar() {
  const { activeEntry, elapsedSeconds, stopTimer } = useTimer();

  if (!activeEntry) return null;
  
  const handleStop = async () => {
    try {
      await stopTimer();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to stop timer');
    }
  };

  return (
    <div
      style={{
        background: 'rgba(79, 216, 224, 0.08)',
        border: '1px solid var(--accent-cyan-dim)',
        borderRadius: 10,
        padding: '10px 12px',
        marginBottom: 10,
      }}
    >
      <div
        style={{
          fontSize: 10.5,
          color: 'var(--accent-cyan)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          fontWeight: 700,
          marginBottom: 4,
          display: 'flex',
          alignItems: 'center',
          gap: 5,
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'var(--accent-cyan)',
            display: 'inline-block',
            animation: 'timerPulse 1.4s ease-in-out infinite',
          }}
        />
        Timer running
      </div>
      <div
        style={{
          fontSize: 12.5,
          color: 'var(--text-primary)',
          fontWeight: 600,
          marginBottom: 6,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={activeEntry.task?.title}
      >
        {activeEntry.task?.title || 'Task'}
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span
          className="mono"
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: 'var(--accent-cyan)',
          }}
        >
          {formatStopwatch(elapsedSeconds)}
        </span>
        <button
          onClick={handleStop}
          style={{
            background: 'var(--status-cancelled)',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '5px 12px',
            fontSize: 11.5,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Stop
        </button>
      </div>
      <style>{`
        @keyframes timerPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
