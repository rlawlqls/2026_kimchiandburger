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

/**
 * Two-line timeline stamp used by History (mockup `stamp()`):
 * `{ day: "Today" | "7/23", time: "14:32" }`.
 */
export function historyStamp(
  timestamp: number,
  now: number = Date.now(),
): { day: string; time: string } {
  const d = new Date(timestamp);
  const n = new Date(now);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const sameDay = d.toDateString() === n.toDateString();
  return {
    day: sameDay ? "Today" : `${d.getMonth() + 1}/${d.getDate()}`,
    time: `${hh}:${mm}`,
  };
}
