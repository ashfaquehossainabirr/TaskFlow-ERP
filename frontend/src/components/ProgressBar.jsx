export default function ProgressBar({ value = 0, max = 1, color = 'var(--accent-cyan)', height = 8 }) {

  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  
  return (
    <div
      style={{
        width: '100%',
        height,
        borderRadius: 999,
        background: 'var(--bg-inset)',
        border: '1px solid var(--border-hairline-soft)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: `${pct}%`,
          height: '100%',
          borderRadius: 999,
          background: color,
          transition: 'width 0.3s ease',
        }}
      />
    </div>
  );
}
