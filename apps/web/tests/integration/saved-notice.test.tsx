// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SavedNotice } from "@/app/(app)/home-screen";

const { replace, params } = vi.hoisted(() => ({
  replace: vi.fn(),
  params: { value: new URLSearchParams() },
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => params.value,
}));

beforeEach(() => {
  replace.mockReset();
});
afterEach(cleanup);

it("annonce « Séance enregistrée. » après l'enregistrement, puis nettoie l'adresse (D28)", () => {
  params.value = new URLSearchParams("enregistree=1");
  const { rerender } = render(<SavedNotice />);
  expect(screen.getByRole("status")).toHaveTextContent("Séance enregistrée.");
  expect(replace).toHaveBeenCalledWith("/", { scroll: false });
  // L'adresse nettoyée ne fait pas disparaître le message tout de suite.
  params.value = new URLSearchParams();
  rerender(<SavedNotice />);
  expect(screen.getByRole("status")).toHaveTextContent("Séance enregistrée.");
});

it("n'annonce rien sur une visite ordinaire de l'accueil", () => {
  params.value = new URLSearchParams();
  render(<SavedNotice />);
  expect(screen.getByRole("status")).toBeEmptyDOMElement();
  expect(replace).not.toHaveBeenCalled();
});
