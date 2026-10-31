// Client de l'API /api/v1 : tout ce que l'interface lit ou écrit passe par ici (ADR 0004).
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(`${status} ${code}`);
    this.name = "ApiError";
  }
}

export async function apiFetch<T>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  const hasBody = init.body !== undefined;
  const res = await fetch(path, {
    method: init.method ?? "GET",
    headers: hasBody ? { "content-type": "application/json" } : undefined,
    body: hasBody ? JSON.stringify(init.body) : undefined,
    credentials: "same-origin",
  });
  if (res.status === 204) return undefined as T;
  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as { error?: unknown } | null;
    throw new ApiError(res.status, typeof payload?.error === "string" ? payload.error : "unknown");
  }
  return (await res.json()) as T;
}
