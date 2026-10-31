import { describe, expect, it } from "vitest";
import { parseEnv } from "@/env";

const valid = {
  DATABASE_URL: "postgres://u:p@h/db",
  BETTER_AUTH_SECRET: "s".repeat(32),
  BETTER_AUTH_URL: "https://maroutine.vercel.app",
};

describe("parseEnv", () => {
  it("accepte une configuration complète", () => {
    expect(parseEnv(valid).BETTER_AUTH_URL).toBe("https://maroutine.vercel.app");
  });
  it("nomme chaque variable manquante", () => {
    expect(() => parseEnv({ ...valid, DATABASE_URL: undefined, BETTER_AUTH_SECRET: "" })).toThrow(
      /DATABASE_URL.*BETTER_AUTH_SECRET|BETTER_AUTH_SECRET.*DATABASE_URL/s,
    );
  });
  it("refuse un secret de moins de 32 caractères", () => {
    expect(() => parseEnv({ ...valid, BETTER_AUTH_SECRET: "court" })).toThrow(/BETTER_AUTH_SECRET/);
  });
});
