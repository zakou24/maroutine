import { expect, it } from "vitest";
import { migrationTarget } from "../../scripts/migrate-on-deploy";

it("hors production (aperçu, local) : aucune migration", () => {
  expect(migrationTarget({ VERCEL_ENV: "preview", DATABASE_URL: "postgres://x" })).toBeNull();
  expect(migrationTarget({ DATABASE_URL: "postgres://x" })).toBeNull();
});

it("en production : préfère l'URL directe", () => {
  expect(
    migrationTarget({
      VERCEL_ENV: "production",
      DATABASE_URL: "postgres://pooler",
      DATABASE_URL_UNPOOLED: "postgres://direct",
    }),
  ).toBe("postgres://direct");
  expect(migrationTarget({ VERCEL_ENV: "production", DATABASE_URL: "postgres://pooler" })).toBe(
    "postgres://pooler",
  );
});

it("en production sans URL : erreur explicite", () => {
  expect(() => migrationTarget({ VERCEL_ENV: "production" })).toThrow(/DATABASE_URL/);
});
