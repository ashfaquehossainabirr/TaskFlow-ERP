export function formatMoney(value) {
  const num = Number(value) || 0;
  const abs = Math.abs(num);
  if (abs >= 1_000_000) {
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 2,
    }).format(num);
  }
  return num.toLocaleString();
}
export function exactMoney(value) {
  return `$${(Number(value) || 0).toLocaleString()}`;
}
