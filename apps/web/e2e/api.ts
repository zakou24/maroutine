import type { APIRequestContext } from "@playwright/test";

// Préparation des données par l'API, avec l'origine de l'app (contrôle T-07) et la session du test.
const ORIGIN = "http://localhost:3100";

export async function createExercise(
  request: APIRequestContext,
  name: string,
  equipment = "barbell",
): Promise<string> {
  const res = await request.post("/api/v1/exercises", {
    headers: { origin: ORIGIN },
    data: { name, equipment, muscleGroup: "legs" },
  });
  if (res.status() !== 201) throw new Error(`exercice non créé : ${res.status()}`);
  return ((await res.json()) as { id: string }).id;
}

export async function createWorkout(
  request: APIRequestContext,
  performedOn: string,
  exercises: { exerciseId: string; sets: { weightKg: number; reps: number }[] }[],
): Promise<string> {
  const res = await request.post("/api/v1/workouts", {
    headers: { origin: ORIGIN },
    data: { performedOn, exercises },
  });
  if (res.status() !== 201) throw new Error(`séance non créée : ${res.status()}`);
  return ((await res.json()) as { id: string }).id;
}

export async function getWorkout(request: APIRequestContext, id: string) {
  return (await (await request.get(`/api/v1/workouts/${id}`)).json()) as {
    exercises: { name: string; sets: { weightKg: number; reps: number }[] }[];
  };
}

// Date du jour à Paris décalée de `offset` jours, au format AAAA-MM-JJ.
export function parisDate(offset = 0): string {
  const now = new Date(Date.now() + offset * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(now);
}

export async function putBodyWeight(request: APIRequestContext, date: string, weightKg: number) {
  const res = await request.put(`/api/v1/body-weights/${date}`, {
    headers: { origin: ORIGIN },
    data: { weightKg },
  });
  if (res.status() !== 200) throw new Error(`pesée non enregistrée : ${res.status()}`);
}
