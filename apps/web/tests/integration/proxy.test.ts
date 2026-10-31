import { NextRequest } from "next/server";
import { expect, it } from "vitest";
import { proxy } from "@/proxy";

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
