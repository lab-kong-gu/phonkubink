// Date/time formatting helpers used across the UI.

export function fmtDate(d?: Date | null): string {
  if (!d) return "";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function fmtTime(d?: Date | null): string {
  if (!d) return "";
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

// "In 73 days" style relative label for upcoming events.
export function daysUntil(d?: Date | null): string {
  if (!d) return "";
  const ms = d.getTime() - Date.now();
  const days = Math.ceil(ms / (24 * 60 * 60 * 1000));
  if (days < 0) return "Past";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `In ${days} days`;
}
