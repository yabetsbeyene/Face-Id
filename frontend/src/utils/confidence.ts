/**
 * Rounds a raw cosine-similarity score (0-1) into fixed confidence bands
 * instead of showing exact decimals like "87.34%".
 */
export function bandConfidence(rawSimilarity?: number): number {
  const pct = Math.max(0, (rawSimilarity || 0) * 100);
  if (pct >= 98) return 100;
  if (pct >= 93) return 95;
  if (pct >= 85) return 90;
  if (pct >= 75) return 80;
  if (pct >= 65) return 70;
  if (pct >= 55) return 60;
  return Math.round(pct / 10) * 10;
}
