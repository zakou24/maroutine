"use client";

import { loginSchema } from "@maroutine/core";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

const MESSAGES: Record<number, string> = {
  401: "Email ou mot de passe incorrect.",
  429: "Trop de tentatives. Réessaie dans une minute.",
};

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = loginSchema.safeParse({
      email: form.get("email"),
      password: form.get("password"),
    });
    if (!parsed.success) {
      setError("Saisis un email valide et ton mot de passe.");
      return;
    }

    setError(null);
    setPending(true);
    try {
      const { error: authError } = await authClient.signIn.email(parsed.data);
      if (authError) {
        setPending(false);
        setError(MESSAGES[authError.status ?? 0] ?? "Connexion impossible. Réessaie.");
        return;
      }
    } catch {
      // Réseau coupé : better-fetch lève une exception au lieu de renvoyer une erreur.
      setPending(false);
      setError("Connexion impossible. Réessaie.");
      return;
    }
    router.replace("/");
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email" className="text-[15px] text-muted-foreground">
          Email
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          className="h-11 rounded-lg bg-surface text-[17px] md:text-[17px]"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password" className="text-[15px] text-muted-foreground">
          Mot de passe
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="h-11 rounded-lg bg-surface text-[17px] md:text-[17px]"
        />
      </div>
      {error ? (
        <p role="alert" className="text-[15px] text-regression-ink">
          {error}
        </p>
      ) : null}
      <Button
        type="submit"
        disabled={pending}
        className="mt-2 h-[52px] rounded-xl text-[17px] font-bold"
      >
        {pending ? "Connexion…" : "Se connecter"}
      </Button>
    </form>
  );
}
