// Number formatters. Pair the output with the `.tabular` class (tabular-nums)
// wherever values change or align in a column, to prevent layout shift.

export function pct(value: number, digits = 0): string {
  return `${(value * 100).toFixed(digits)}%`;
}

export function points(value: number, digits = 1): string {
  // percentage-point delta, e.g. "6.6 pp"
  return `${(value * 100).toFixed(digits)} pp`;
}

export function int(value: number): string {
  return value.toLocaleString("en-US");
}

export function usd(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}
