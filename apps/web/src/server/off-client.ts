// Recherche Open Food Facts par Search-a-licious, côté serveur (ADR 0007). Limite publiée :
// 10 recherches par minute et par IP. Ni la requête ni la réponse ne sont journalisées (T-11).

const SEARCH_URL = "https://search.openfoodfacts.org/search";
export const OFF_USER_AGENT = "MaRoutine/1.0 (https://github.com/zakou24/maroutine)";

export type OffSearch = (q: string, signal: AbortSignal) => Promise<unknown[]>;

export const searchOpenFoodFacts: OffSearch = async (q, signal) => {
  // OPEN_FOOD_FACTS=off : pas d'appel externe (e2e déterministes, sans réseau).
  if (process.env.OPEN_FOOD_FACTS === "off") return [];
  const url = new URL(SEARCH_URL);
  url.searchParams.set("q", q);
  url.searchParams.set("langs", "fr");
  url.searchParams.set("page_size", "20");
  url.searchParams.set("fields", "code,product_name,product_name_fr,brands,nutriments");
  const res = await fetch(url, {
    headers: { "user-agent": OFF_USER_AGENT, accept: "application/json" },
    signal,
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`off_status_${res.status}`);
  const body = (await res.json()) as { hits?: unknown };
  return Array.isArray(body.hits) ? body.hits : [];
};
