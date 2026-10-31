import { expect, it } from "vitest";
import { GET } from "@/app/icons/[size]/route";

function call(size: string) {
  return GET(new Request(`http://localhost:3000/icons/${size}`), {
    params: Promise.resolve({ size }),
  } as Parameters<typeof GET>[1]);
}

it("/icons/constructor répond 404", async () => {
  expect((await call("constructor")).status).toBe(404);
});

it("/icons/inconnu répond 404", async () => {
  expect((await call("inconnu")).status).toBe(404);
});
