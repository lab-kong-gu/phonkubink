// Date/time formatting helpers used across the UI — Thai locale (พ.ศ. years,
// Thai month names).

export function fmtDate(d?: Date | null): string {
  if (!d) return "";
  return d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
}

export function fmtTime(d?: Date | null): string {
  if (!d) return "";
  return d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
}

// "อีก 73 วัน" style relative label for upcoming events.
export function daysUntil(d?: Date | null): string {
  if (!d) return "";
  const ms = d.getTime() - Date.now();
  const days = Math.ceil(ms / (24 * 60 * 60 * 1000));
  if (days < 0) return "ผ่านไปแล้ว";
  if (days === 0) return "วันนี้";
  if (days === 1) return "พรุ่งนี้";
  return `อีก ${days} วัน`;
}
