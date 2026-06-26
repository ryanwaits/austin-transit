/**
 * Wilson score 95% confidence interval for a binomial proportion.
 * More accurate than the normal approximation for small n or extreme p.
 * Returns the interval bounds as proportions in [0, 1].
 */
export function wilsonCi(
  successes: number,
  total: number,
  z = 1.96,
): { low: number; high: number; p: number } {
  if (total === 0) return { low: 0, high: 0, p: 0 };
  const p = successes / total;
  const z2 = z * z;
  const denom = 1 + z2 / total;
  const center = (p + z2 / (2 * total)) / denom;
  const margin = (z * Math.sqrt((p * (1 - p)) / total + z2 / (4 * total * total))) / denom;
  return { low: center - margin, high: center + margin, p };
}
