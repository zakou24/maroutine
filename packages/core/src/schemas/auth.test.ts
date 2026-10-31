import { describe, expect, it } from "vitest";
import { loginSchema, ownerPasswordSchema } from "./auth";

describe("loginSchema", () => {
  it("nettoie l'email saisi sur mobile", () => {
    expect(loginSchema.parse({ email: "  Zak@Mail.COM ", password: "x" }).email).toBe(
      "zak@mail.com",
    );
  });
  it("refuse un email invalide", () => {
    expect(loginSchema.safeParse({ email: "zak", password: "x" }).success).toBe(false);
  });
  it("refuse un mot de passe vide", () => {
    expect(loginSchema.safeParse({ email: "a@b.fr", password: "" }).success).toBe(false);
  });
});

describe("ownerPasswordSchema", () => {
  it("exige 12 caractères", () => {
    expect(ownerPasswordSchema.safeParse("a".repeat(11)).success).toBe(false);
    expect(ownerPasswordSchema.safeParse("a".repeat(12)).success).toBe(true);
  });
  it("plafonne à 128 caractères", () => {
    expect(ownerPasswordSchema.safeParse("a".repeat(129)).success).toBe(false);
  });
});
