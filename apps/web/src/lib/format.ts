// Dates calendaires « AAAA-MM-JJ » affichées en français, sans décalage de fuseau.
const dayMonth = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
const longDate = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

function utc(date: string) {
  return new Date(`${date}T00:00:00Z`);
}

// « 30 oct. »
export function formatDayMonth(date: string): string {
  return dayMonth.format(utc(date));
}

// « vendredi 30 octobre »
export function formatLongDate(date: string): string {
  return longDate.format(utc(date));
}

const dayMonthLong = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});
const monthYear = new Intl.DateTimeFormat("fr-FR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

// « 26 octobre »
export function formatDayMonthLong(date: string): string {
  return dayMonthLong.format(utc(date));
}

// « 2026-11 » → « novembre 2026 »
export function formatMonth(month: string): string {
  return monthYear.format(utc(`${month}-01`));
}

// « 1 séance », « 3 séances » (0 au singulier, comme en français).
export function countLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count > 1 ? plural : singular}`;
}
