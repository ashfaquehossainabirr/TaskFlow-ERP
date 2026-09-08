import { formatCount } from '../utils/formatCount';

export default function DonutChart({ segments, size = 160, thickness = 20, centerLabel, centerSubLabel }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  let cumulative = 0;
  
  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        flexShrink: 0,
      }}
    >
      <svg
        width={size}
        height={size}
        style={{
          transform: 'rotate(-90deg)',
        }}
        role="img"
        aria-label="Donut chart"
      >
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--bg-inset)"
          strokeWidth={thickness}
        />

        {total > 0 &&
          segments
            .filter((s) => s.value > 0)
            .map((s) => {
              const fraction = s.value / total;
              const dash = fraction * circumference;
              const offset = -cumulative * circumference;
              cumulative += fraction;
              return (
                <circle
                  key={s.label}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={thickness}
                  strokeDasharray={`${dash} ${circumference - dash}`}
                  strokeDashoffset={offset}
                  strokeLinecap="butt"
                >
                  <title>{`${s.label}: ${formatCount(s.value)}`}</title>
                </circle>
              );
            })}
      </svg>

      {(centerLabel || centerSubLabel) && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          {centerLabel && (
            <span
              className="mono"
              style={{
                fontSize: 26,
                fontWeight: 700,
                color: 'var(--text-primary)',
                lineHeight: 1,
              }}
            >
              {centerLabel}
            </span>
          )}
          {centerSubLabel && (
            <span
              style={{
                fontSize: 11,
                color: 'var(--text-muted)',
                marginTop: 4,
              }}
            >
              {centerSubLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
