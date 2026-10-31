// Neon et PGlite remontent le code PostgreSQL, parfois enveloppé par Drizzle dans `cause`.
export function isUniqueViolation(error: unknown): boolean {
  for (let current = error; current; current = (current as { cause?: unknown }).cause) {
    if ((current as { code?: unknown }).code === "23505") return true;
  }
  return false;
}
