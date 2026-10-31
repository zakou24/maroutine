// Dates calendaires « AAAA-MM-JJ » affichées en français, sans décalage de fuseau.
const dayMonth = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
const shortDate = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
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

// Le premier du mois s'écrit « 1er » en français.
function firstOfMonth(text: string, date: string): string {
  return date.endsWith("-01") ? text.replace(/(^|\s)1(?=\s)/, "$11er") : text;
}

// « 30 oct. »
export function formatDayMonth(date: string): string {
  return firstOfMonth(dayMonth.format(utc(date)), date);
}

// « vendredi 30 octobre »
export function formatLongDate(date: string): string {
  return firstOfMonth(longDate.format(utc(date)), date);
}

// « sam. 31 oct. »
export function formatShortDate(date: string): string {
  return firstOfMonth(shortDate.format(utc(date)), date);
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

// « 26 octobre », « 1er novembre »
export function formatDayMonthLong(date: string): string {
  return firstOfMonth(dayMonthLong.format(utc(date)), date);
}

// « 2026-11 » → « novembre 2026 »
export function formatMonth(month: string): string {
  return monthYear.format(utc(`${month}-01`));
}

// « 1 séance », « 3 séances » (0 au singulier, comme en français).
export function countLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count > 1 ? plural : singular}`;
}

const monthShort = new Intl.DateTimeFormat("fr-FR", { month: "short", timeZone: "UTC" });

// « 2026-11-04 » → « nov. »
export function formatMonthShort(date: string): string {
  return monthShort.format(utc(date));
}
