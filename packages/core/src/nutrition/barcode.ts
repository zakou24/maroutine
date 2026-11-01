// Code-barres lu par le scanner ou tapé à la main (D29) : EAN-13, EAN-8 ou UPC-A, clé GS1
// vérifiée. Un UPC-A prend un 0 en tête, la forme sous laquelle Open Food Facts le range.
function checkDigitOk(digits: string): boolean {
  const body = digits.slice(0, -1);
  let sum = 0;
  for (let i = 0; i < body.length; i++) {
    // Poids 3 pour le chiffre le plus proche de la clé, puis alternance 1 et 3.
    sum += Number(body[body.length - 1 - i]) * (i % 2 === 0 ? 3 : 1);
  }
  return (10 - (sum % 10)) % 10 === Number(digits.at(-1));
}

export function normalizeBarcode(raw: string): string | null {
  const digits = raw.replace(/\s/g, "");
  if (!/^(\d{8}|\d{12}|\d{13})$/.test(digits) || !checkDigitOk(digits)) return null;
  return digits.length === 12 ? `0${digits}` : digits;
}
