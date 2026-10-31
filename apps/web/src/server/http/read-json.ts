import type { ZodType } from "zod";
import { BadRequestError, UnsupportedMediaTypeError } from "./errors";

// Lit et valide le corps JSON d'une requête : 415, 400 invalid_json ou ZodError (400 invalid).
export async function readJson<T>(request: Request, schema: ZodType<T>): Promise<T> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!/^application\/json\s*(;|$)/i.test(contentType)) throw new UnsupportedMediaTypeError();
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new BadRequestError("invalid_json");
  }
  return schema.parse(body);
}
