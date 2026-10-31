import { z } from "zod";
import { NotFoundError } from "./errors";

const uuidSchema = z.uuid();

// Un identifiant mal formé désigne une ressource qui n'existe pas : 404, jamais une erreur SQL.
export function resourceId(value: string | undefined): string {
  const parsed = uuidSchema.safeParse(value);
  if (!parsed.success) throw new NotFoundError();
  return parsed.data;
}
