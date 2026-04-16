/**
 * Format a Date as "YYYY-MM-DD" for use as Firestore document IDs.
 */
export function uidDate(d) {
  const y   = d.getFullYear();
  const m   = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Return the first weekday index (0=Sun) and total day count for a given month.
 */
export function getMonthInfo(y, m) {
  const first = new Date(y, m, 1);
  const last  = new Date(y, m + 1, 0);
  return { firstDayIndex: first.getDay(), days: last.getDate() };
}
