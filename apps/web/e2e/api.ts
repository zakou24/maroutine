import type { APIRequestContext } from "@playwright/test";

// Préparation des données par l'API, avec l'origine de l'app (contrôle T-07) et la session du test.
const ORIGIN = "http://localhost:3100";

export async function createExercise(
  request: APIRequestContext,
  name: string,
  equipment = "barbell",
  muscleGroup = "legs",
): Promise<string> {
  const res = await request.post("/api/v1/exercises", {
    headers: { origin: ORIGIN },
    data: { name, equipment, muscleGroup },
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
    id: string;
    muscleGroups: string[];
    exercises: { name: string; sets: { weightKg: number; reps: number }[] }[];
  };
}

// Séance du jour `date` qui contient l'exercice `name` : après l'enregistrement, l'app ramène à
// l'accueil (D28) et la base e2e est partagée entre les tests.
export async function findWorkoutWith(request: APIRequestContext, date: string, name: string) {
  const summaries = (await (
    await request.get(`/api/v1/workouts?from=${date}&to=${date}`)
  ).json()) as { id: string }[];
  for (const { id } of summaries) {
    const workout = await getWorkout(request, id);
    if (workout.exercises.some((e) => e.name === name)) return workout;
  }
  throw new Error(`aucune séance du ${date} avec ${name}`);
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
