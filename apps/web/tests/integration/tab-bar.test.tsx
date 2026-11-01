// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppNav } from "@/components/app-nav";
import { TabBar } from "@/components/tab-bar";

const { pathname } = vi.hoisted(() => ({ pathname: { current: "/" } }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.current }));

afterEach(cleanup);

describe("navigation de l'app", () => {
  it("la barre d'onglets marque l'onglet courant", () => {
    pathname.current = "/exercices";
    render(<TabBar />);
    expect(screen.getByRole("link", { name: "Exercices" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Accueil" })).not.toHaveAttribute("aria-current");
  });

  it("une page enfant garde son onglet actif", () => {
    pathname.current = "/exercices/nouveau";
    render(<TabBar />);
    expect(screen.getByRole("link", { name: "Exercices" })).toHaveAttribute("aria-current", "page");
  });

  it("le calendrier et une séance passée relèvent de « Plus » et de « Semaine »", () => {
    pathname.current = "/calendrier";
    render(<TabBar />);
    expect(screen.getByRole("link", { name: "Plus" })).toHaveAttribute("aria-current", "page");
  });

  it("propose Accueil, Séance, Repas, Exercices et Plus dans cet ordre (D24)", () => {
    pathname.current = "/";
    render(<AppNav />);
    expect(screen.getAllByRole("link").map((l) => [l.textContent, l.getAttribute("href")])).toEqual(
      [
        ["Accueil", "/"],
        ["Séance", "/saisie"],
        ["Repas", "/alimentation"],
        ["Exercices", "/exercices"],
        ["Plus", "/plus"],
      ],
    );
    expect(screen.getByRole("link", { name: "Accueil" })).toHaveAttribute("aria-current", "page");
  });
});
