/** Display range for microphone power in dBFS; not a speech quality measure. */
export function audioLevel(decibels?: number) {
  if (decibels === undefined || !Number.isFinite(decibels)) return undefined;
  // Suppress low room noise so quiet input rests on the baseline.
  return Math.max(0, Math.min(1, (decibels + 50) / 44));
}
