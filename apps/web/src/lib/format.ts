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
