import { NextRequest } from "next/server";
import { expect, it } from "vitest";
import { config, proxy } from "@/proxy";

it("sans cookie de session, une page protégée redirige vers /connexion", () => {
  const res = proxy(new NextRequest("http://localhost:3000/"));
  expect(res.status).toBe(307);
  expect(res.headers.get("location")).toBe("http://localhost:3000/connexion");
});

it("avec un cookie de session, la requête continue (la vraie vérification est côté serveur)", () => {
  const req = new NextRequest("http://localhost:3000/", {
    headers: { cookie: "better-auth.session_token=abc.def" },
  });
  const res = proxy(req);
  expect(res.headers.get("location")).toBeNull();
});

function matches(path: string) {
  const pattern = config.matcher[0] ?? "";
  // Même interprétation que Next.js : le motif doit couvrir tout le chemin.
  return new RegExp(`^${pattern}$`).test(path);
}

it("/apixyz et /icons-test sont protégés, /api/v1/health et /icons/192 ne le sont pas", () => {
  expect(matches("/apixyz")).toBe(true);
  expect(matches("/icons-test")).toBe(true);
  expect(matches("/connexionx")).toBe(true);
  expect(matches("/api/v1/health")).toBe(false);
  expect(matches("/icons/192")).toBe(false);
  expect(matches("/connexion")).toBe(false);
  expect(matches("/")).toBe(true);
});

it("/robots.txt n'est pas redirigé", () => {
  expect(matches("/robots.txt")).toBe(false);
});
