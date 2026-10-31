import { z } from "zod";

// L'iPhone met souvent une majuscule initiale ou un espace final : on nettoie avant de valider.
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(1),
});

export type LoginInput = z.infer<typeof loginSchema>;

// La longueur minimale n'est imposée qu'à la création du compte (pnpm create-owner).
export const ownerPasswordSchema = z.string().min(12).max(128);
