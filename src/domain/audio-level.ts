/** Display range for microphone power in dBFS; not a speech quality measure. */
export function audioLevel(decibels?: number) {
  if (decibels === undefined || !Number.isFinite(decibels)) return undefined;
  return Math.max(0, Math.min(1, (decibels + 60) / 54));
}
