// Lecture défensive d'un produit Open Food Facts (ADR 0007, T-08) : tout ce qui sort des bornes
// ou manque est écarté, plutôt que corrigé.

export type OffProduct = {
  offCode: string;
  name: string;
  brand: string | null;
  kcalPer100g: number;
  proteinPer100g: number;
};

const MAX_KCAL = 900;
const MAX_PROTEIN = 100;

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 80) : null;
}

function number(value: unknown, max: number): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= max
    ? Math.round(value * 10) / 10
    : null;
}

export function parseOffHit(hit: unknown): OffProduct | null {
  if (typeof hit !== "object" || hit === null) return null;
  const h = hit as Record<string, unknown>;
  const code = typeof h.code === "string" && /^\d{4,20}$/.test(h.code) ? h.code : null;
  const name = text(h.product_name_fr) ?? text(h.product_name);
  const nutriments = (typeof h.nutriments === "object" && h.nutriments) as Record<string, unknown>;
  const kcal = nutriments ? number(nutriments["energy-kcal_100g"], MAX_KCAL) : null;
  const protein = nutriments ? number(nutriments["proteins_100g"], MAX_PROTEIN) : null;
  if (!code || !name || kcal === null || protein === null) return null;
  const brands = Array.isArray(h.brands)
    ? h.brands[0]
    : typeof h.brands === "string"
      ? h.brands.split(",")[0]
      : null;
  return { offCode: code, name, brand: text(brands), kcalPer100g: kcal, proteinPer100g: protein };
}
