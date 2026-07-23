/** Compact "time ago" label for the scan timeline, e.g. "just now", "3 min ago", "2 h ago". */
export function timeAgo(timestamp: number, now: number = Date.now()): string {
  const secs = Math.max(0, Math.floor((now - timestamp) / 1000));
  if (secs < 45) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "yesterday" : `${days} d ago`;
}
