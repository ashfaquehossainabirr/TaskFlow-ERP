// Formats large counts compactly: 1000 -> "1K+", 1500 -> "1.5K+",
// 1000000 -> "1M+", 1000000000 -> "1B+". Numbers under 1000 are shown exactly.
// The trailing "+" signals the value has been rounded down to fit the space.
export function formatCount(value) {
  const num = Number(value) || 0;
  const abs = Math.abs(num);
  const sign = num < 0 ? '-' : '';

  if (abs < 1000) return `${num}`;

  const units = [
    { threshold: 1_000_000_000, suffix: 'B' },
    { threshold: 1_000_000, suffix: 'M' },
    { threshold: 1_000, suffix: 'K' },
  ];

  const unit = units.find((u) => abs >= u.threshold);
  const scaled = Math.floor((abs / unit.threshold) * 10) / 10; // round down to 1 decimal
  const formatted = Number.isInteger(scaled) ? scaled.toString() : scaled.toFixed(1);

  return `${sign}${formatted}${unit.suffix}+`;
}

// Full, comma-separated value for use in a tooltip/title next to the compact display.
export function exactCount(value) {
  return (Number(value) || 0).toLocaleString();
}
