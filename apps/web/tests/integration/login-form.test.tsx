// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "@/app/(public)/connexion/login-form";

const { signIn, replace } = vi.hoisted(() => ({ signIn: vi.fn(), replace: vi.fn() }));
vi.mock("@/lib/auth-client", () => ({ authClient: { signIn: { email: signIn } } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

async function submit(email = "zak@mail.com", password = "correct-horse-battery") {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Email"), email);
  await user.type(screen.getByLabelText("Mot de passe"), password);
  await user.click(screen.getByRole("button", { name: "Se connecter" }));
}

describe("LoginForm", () => {
  beforeEach(() => {
    signIn.mockReset();
    replace.mockReset();
    render(<LoginForm />);
  });
  afterEach(cleanup);

  it("le champ email désactive la majuscule automatique", () => {
    const email = screen.getByLabelText("Email");
    expect(email).toHaveAttribute("autocapitalize", "none");
    expect(email).toHaveAttribute("autocomplete", "email");
    expect(email).toHaveAttribute("type", "email");
  });

  it("le champ mot de passe propose le gestionnaire de mots de passe", () => {
    expect(screen.getByLabelText("Mot de passe")).toHaveAttribute(
      "autocomplete",
      "current-password",
    );
  });

  it("envoie l'email nettoyé puis ouvre l'accueil", async () => {
    signIn.mockResolvedValue({ data: {}, error: null });
    await submit("  Zak@Mail.com ");
    expect(signIn).toHaveBeenCalledWith(expect.objectContaining({ email: "zak@mail.com" }));
    expect(replace).toHaveBeenCalledWith("/");
  });

  it("affiche « Email ou mot de passe incorrect. » sur un 401", async () => {
    signIn.mockResolvedValue({ data: null, error: { status: 401 } });
    await submit();
    expect(await screen.findByRole("alert")).toHaveTextContent("Email ou mot de passe incorrect.");
    expect(replace).not.toHaveBeenCalled();
  });

  it("affiche « Trop de tentatives. Réessaie dans une minute. » sur un 429", async () => {
    signIn.mockResolvedValue({ data: null, error: { status: 429 } });
    await submit();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Trop de tentatives. Réessaie dans une minute.",
    );
  });

  it("sur une panne réseau, affiche une erreur et réactive le bouton", async () => {
    signIn.mockRejectedValue(new TypeError("Failed to fetch"));
    await submit();
    expect(await screen.findByRole("alert")).toHaveTextContent("Connexion impossible. Réessaie.");
    expect(screen.getByRole("button", { name: "Se connecter" })).toBeEnabled();
  });

  it("désactive le bouton pendant l'envoi", async () => {
    signIn.mockReturnValue(new Promise(() => {}));
    await submit();
    expect(screen.getByRole("button", { name: /connexion/i })).toBeDisabled();
  });
});
