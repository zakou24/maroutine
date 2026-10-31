// Dates calendaires « AAAA-MM-JJ » (C13). Les calculs passent par UTC, jamais par l'heure locale de la machine.

const DAY_MS = 24 * 60 * 60 * 1000;

function toUtc(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

function fromUtc(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// La date du jour dans un fuseau : à 23 h 45 à Paris, c'est encore aujourd'hui, même si UTC a changé de jour.
export function todayIn(timeZone: string, now: Date): string {
  // en-CA formate en AAAA-MM-JJ.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function addDays(date: string, days: number): string {
  return fromUtc(new Date(toUtc(date).getTime() + days * DAY_MS));
}

// Nombre de jours de `from` à `to` (négatif si `to` est avant).
export function daysBetween(from: string, to: string): number {
  return Math.round((toUtc(to).getTime() - toUtc(from).getTime()) / DAY_MS);
}

// Lundi de la semaine qui contient cette date.
export function startOfWeek(date: string): string {
  const weekday = (toUtc(date).getUTCDay() + 6) % 7; // lundi = 0
  return addDays(date, -weekday);
}

// « 2026-11 » → les semaines (lundi → dimanche) qui couvrent tout le mois, jours voisins compris.
export function monthGrid(month: string): string[][] {
  const first = `${month}-01`;
  const start = toUtc(first);
  const last = fromUtc(new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)));
  const weeks: string[][] = [];
  for (let day = startOfWeek(first); day <= last; day = addDays(day, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(day, i)));
  }
  return weeks;
}

// « 2026-12 » + 1 → « 2027-01 ».
export function addMonths(month: string, months: number): string {
  const [year, monthIndex] = month.split("-").map(Number) as [number, number];
  const date = new Date(Date.UTC(year, monthIndex - 1 + months, 1));
  return date.toISOString().slice(0, 7);
}

// Calendrier d'activité (D17) : `weeks` colonnes de 7 jours (lundi → dimanche), la dernière contient `today`.
export function activityWeeks(today: string, weeks: number): string[][] {
  const lastMonday = startOfWeek(today);
  return Array.from({ length: weeks }, (_, w) => {
    const monday = addDays(lastMonday, -7 * (weeks - 1 - w));
    return Array.from({ length: 7 }, (_, d) => addDays(monday, d));
  });
}

// « 2027-03-31 » - 1 mois → « 2027-02-28 » : un jour absent du mois d'arrivée devient son dernier jour.
export function addMonthsToDate(date: string, months: number): string {
  const month = addMonths(date.slice(0, 7), months);
  const [year, monthIndex] = month.split("-").map(Number) as [number, number];
  const lastDay = new Date(Date.UTC(year, monthIndex, 0)).getUTCDate();
  const day = Math.min(Number(date.slice(8)), lastDay);
  return `${month}-${String(day).padStart(2, "0")}`;
}
