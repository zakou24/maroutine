// Le clavier décimal de l'iPhone en français tape une virgule : « 62,5 » doit valoir 62,5 et non 625.
const DECIMAL = /^\d+(?:[.,]\d+)?$/;

// Nombre positif écrit avec une virgule ou un point ; null pour tout le reste (signe, exposant, vide).
export function parseDecimal(input: string): number | null {
  const text = input.trim();
  if (!DECIMAL.test(text)) return null;
  return Number(text.replace(",", "."));
}

// 62.5 → « 62,5 », 60 → « 60 » : deux décimales au plus, sans zéros inutiles.
export function formatKg(value: number): string {
  return String(Math.round(value * 100) / 100).replace(".", ",");
}
