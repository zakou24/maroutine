"use client";

import {
  todayIn,
  type Exercise,
  type LastSets,
  type Workout,
  type WorkoutInput,
} from "@maroutine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Plus, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useReducer, useRef, useState } from "react";
import { FormError } from "@/components/form-error";
import {
  fieldClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/form-styles";
import { Page } from "@/components/page";
import { LoadError, Loading } from "@/components/query-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError, apiFetch } from "@/lib/api";
import { readStored, removeStored, writeStored } from "@/lib/draft-storage";
import { formatDayMonth } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useIsClient } from "@/lib/use-is-client";
import {
  draftReducer,
  draftStorageKey,
  emptyDraft,
  toWorkoutInput,
  type DraftAction,
  type DraftExercise,
  type WorkoutDraft,
} from "./workout-draft";
import { ExercisePicker } from "./exercise-picker";

const TIME_ZONE = "Europe/Paris";
const NO_HISTORY: LastSets = { performedOn: null, sets: [] };

type EditorProps =
  | { mode: "create"; initialDate?: string; workoutId?: undefined }
  | { mode: "edit"; workoutId: string; initialDate?: undefined };

// Saisie du soir (création) ou séance passée (modification). Rendu côté navigateur uniquement :
// la date du jour et le brouillon dépendent de l'appareil.
export function WorkoutEditor(props: EditorProps) {
  const isClient = useIsClient();
  if (!isClient) {
    return (
      <Page title={props.mode === "create" ? "Saisie du soir" : "Séance"}>
        <Loading />
      </Page>
    );
  }
  return props.mode === "create" ? (
    <CreateEditor today={props.initialDate ?? todayIn(TIME_ZONE, new Date())} />
  ) : (
    <EditEditor workoutId={props.workoutId} />
  );
}

function CreateEditor({ today }: { today: string }) {
  return (
    <EditorForm
      mode="create"
      title="Saisie du soir"
      storageKey={draftStorageKey(today)}
      base={() => emptyDraft(today)}
    />
  );
}

function EditEditor({ workoutId }: { workoutId: string }) {
  const workout = useQuery({
    queryKey: ["workout", workoutId],
    queryFn: () => apiFetch<Workout>(`/api/v1/workouts/${workoutId}`),
  });
  if (workout.isPending) {
    return (
      <Page title="Séance">
        <Loading />
      </Page>
    );
  }
  if (workout.isError) {
    const missing = workout.error instanceof ApiError && workout.error.status === 404;
    return (
      <Page title="Séance">
        {missing ? (
          <p className="text-[17px] text-muted-foreground">
            Cette séance n&apos;existe pas.{" "}
            <Link href="/" className="text-action underline underline-offset-4">
              Retour à la semaine
            </Link>
          </p>
        ) : (
          <LoadError message="Impossible de charger la séance." onRetry={() => workout.refetch()} />
        )}
      </Page>
    );
  }
  const loaded = workout.data;
  return (
    <EditorForm
      key={loaded.id}
      mode="edit"
      workoutId={loaded.id}
      title={`Séance du ${formatDayMonth(loaded.performedOn)}`}
      storageKey={draftStorageKey(loaded.performedOn, loaded.id)}
      base={() => draftReducer(emptyDraft(loaded.performedOn), { type: "load", workout: loaded })}
    />
  );
}

function saveErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 404) {
    return "Un exercice de la séance n'existe plus. Retire-le puis réessaie.";
  }
  return "Enregistrement impossible. Réessaie.";
}

function EditorForm({
  mode,
  workoutId,
  title,
  storageKey,
  base,
}: {
  mode: "create" | "edit";
  workoutId?: string;
  title: string;
  storageKey: string;
  base: () => WorkoutDraft;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const dateId = useId();
  const noteId = useId();
  const deleteDialog = useRef<HTMLDialogElement>(null);

  // Le brouillon restauré l'emporte sur l'état de départ (Review Focus 4).
  const [start] = useState(() => {
    const stored = readStored<WorkoutDraft>(storageKey);
    return { draft: stored ?? base(), restored: stored !== null };
  });
  const [draft, dispatch] = useReducer(draftReducer, start.draft);
  const [restored, setRestored] = useState(start.restored);
  // N'écrire le brouillon qu'après une vraie modification, pas à l'ouverture d'une séance passée.
  const dirty = useRef(start.restored);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    if (dirty.current) writeStored(storageKey, draft);
  }, [draft, storageKey]);

  function act(action: DraftAction) {
    dirty.current = true;
    setStatus(null);
    dispatch(action);
  }

  function resetTo(next: WorkoutDraft) {
    dirty.current = false;
    removeStored(storageKey);
    setRestored(false);
    setErrors({});
    dispatch({ type: "restore", draft: next });
  }

  const exercises = useQuery({
    queryKey: ["exercises", "all"],
    queryFn: () => apiFetch<Exercise[]>("/api/v1/exercises?filter=all"),
  });
  const byId = new Map((exercises.data ?? []).map((e) => [e.id, e]));
  const inDraft = new Set(draft.exercises.map((e) => e.exerciseId));
  const available = (exercises.data ?? []).filter((e) => !e.archived && !inDraft.has(e.id));

  async function addExercise(exercise: Exercise) {
    setPicking(true);
    const lastSets = await apiFetch<LastSets>(
      `/api/v1/exercises/${exercise.id}/last-sets?before=${draft.performedOn}`,
    ).catch(() => NO_HISTORY);
    setPicking(false);
    act({ type: "addExercise", exercise, lastSets });
  }

  const save = useMutation({
    mutationFn: (input: WorkoutInput) =>
      mode === "create"
        ? apiFetch<Workout>("/api/v1/workouts", { method: "POST", body: input })
        : apiFetch<Workout>(`/api/v1/workouts/${workoutId}`, { method: "PUT", body: input }),
    onSuccess: async (workout) => {
      queryClient.setQueryData(["workout", workout.id], workout);
      await queryClient.invalidateQueries({ queryKey: ["workouts"] });
      if (mode === "create") {
        // L'écran reste monté (caché) après la navigation : il repart d'une saisie vide.
        resetTo(emptyDraft(draft.performedOn));
        router.push(`/seances/${workout.id}`);
      } else {
        dirty.current = false;
        removeStored(storageKey);
        setRestored(false);
        setStatus("Séance enregistrée.");
      }
    },
    onError: (error) => setSaveError(saveErrorMessage(error)),
  });

  const remove = useMutation({
    mutationFn: () => apiFetch<void>(`/api/v1/workouts/${workoutId}`, { method: "DELETE" }),
    onSuccess: async () => {
      dirty.current = false;
      removeStored(storageKey);
      queryClient.removeQueries({ queryKey: ["workout", workoutId] });
      await queryClient.invalidateQueries({ queryKey: ["workouts"] });
      router.push("/");
    },
    onError: () => {
      deleteDialog.current?.close();
      setSaveError("Suppression impossible. Réessaie.");
    },
  });

  function onSave() {
    setSaveError(null);
    setStatus(null);
    const result = toWorkoutInput(draft);
    if (!result.ok) {
      setErrors(result.errors);
      setSaveError(result.errors.exercises ?? "Corrige les séries signalées en rouge.");
      return;
    }
    setErrors({});
    save.mutate(result.input);
  }

  return (
    <Page title={title} className="pb-0">
      <div className="flex flex-col gap-2">
        <label htmlFor={dateId} className={labelClass}>
          Date
        </label>
        <Input
          id={dateId}
          type="date"
          value={draft.performedOn}
          onChange={(e) => {
            if (e.target.value) act({ type: "setDate", performedOn: e.target.value });
          }}
          className={`${fieldClass} w-48`}
        />
      </div>

      {restored ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-corridor px-4 py-3 text-[15px] text-corridor-ink">
          <span>Brouillon non enregistré restauré.</span>
          <button
            type="button"
            className="min-h-11 font-bold underline underline-offset-4"
            onClick={() => resetTo(base())}
          >
            {mode === "create" ? "Repartir de zéro" : "Annuler les modifications"}
          </button>
        </div>
      ) : null}

      {draft.exercises.length === 0 ? (
        <p className="text-[17px] text-muted-foreground">
          Ajoute les exercices de ta séance : leurs séries se préremplissent depuis la dernière
          fois.
        </p>
      ) : null}

      {draft.exercises.map((exercise, index) => (
        <ExerciseCard
          key={exercise.key}
          exercise={exercise}
          range={byId.get(exercise.exerciseId)}
          first={index === 0}
          last={index === draft.exercises.length - 1}
          errors={errors}
          act={act}
        />
      ))}

      {exercises.isError ? (
        <LoadError
          message="Impossible de charger tes exercices."
          onRetry={() => exercises.refetch()}
        />
      ) : (
        <ExercisePicker
          available={available}
          disabled={exercises.isPending || picking}
          onPick={addExercise}
        />
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor={noteId} className={labelClass}>
          Note (facultative)
        </label>
        <textarea
          id={noteId}
          value={draft.note}
          maxLength={500}
          rows={2}
          onChange={(e) => act({ type: "setNote", note: e.target.value })}
          className="min-h-11 rounded-lg border border-input bg-surface px-2.5 py-2 text-[17px] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>

      {mode === "edit" ? (
        <div>
          <Button
            variant="outline"
            className={`${secondaryButtonClass} text-regression-ink`}
            onClick={() => deleteDialog.current?.showModal()}
          >
            <Trash2 aria-hidden className="size-5" strokeWidth={2} />
            Supprimer la séance
          </Button>
          <dialog
            ref={deleteDialog}
            aria-labelledby={`${noteId}-delete`}
            className="m-auto w-[min(100%-32px,400px)] rounded-xl border border-rule bg-surface p-5 text-foreground backdrop:bg-ink/40"
          >
            <h2 id={`${noteId}-delete`} className="text-[20px] leading-7 font-bold">
              Supprimer cette séance ?
            </h2>
            <p className="mt-2 text-[15px] text-muted-foreground">
              Ses exercices et ses séries seront effacés. Tes exercices restent.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <Button
                variant="outline"
                className={secondaryButtonClass}
                onClick={() => deleteDialog.current?.close()}
              >
                Annuler
              </Button>
              <Button
                className={`${secondaryButtonClass} bg-regression font-bold text-white hover:bg-regression-ink`}
                disabled={remove.isPending}
                onClick={() => remove.mutate()}
              >
                Supprimer
              </Button>
            </div>
          </dialog>
        </div>
      ) : null}

      {/* Bouton fixé au-dessus de la barre d'onglets sur iPhone. */}
      <div className="sticky bottom-[calc(52px+env(safe-area-inset-bottom))] -mx-4 mt-auto flex flex-col gap-2 border-t border-rule bg-background px-4 pt-3 pb-3 sm:-mx-6 sm:px-6 md:bottom-0">
        <FormError>{saveError}</FormError>
        {status ? (
          <p role="status" className="text-[15px] text-corridor-ink">
            {status}
          </p>
        ) : null}
        <Button className={primaryButtonClass} disabled={save.isPending} onClick={onSave}>
          {save.isPending ? "Enregistrement…" : "Enregistrer la séance"}
        </Button>
      </div>
    </Page>
  );
}

function ExerciseCard({
  exercise,
  range,
  first,
  last,
  errors,
  act,
}: {
  exercise: DraftExercise;
  range?: Exercise;
  first: boolean;
  last: boolean;
  errors: Record<string, string>;
  act: (action: DraftAction) => void;
}) {
  const titleId = useId();
  const setErrors = exercise.sets
    .map((set, i) =>
      errors[set.key] ? `Série ${i + 1} : ${errors[set.key]!.toLowerCase()}.` : null,
    )
    .filter((message): message is string => message !== null);

  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col gap-3 rounded-xl border border-rule bg-surface px-3 py-4 sm:px-4"
    >
      <header className="flex items-baseline justify-between gap-3 px-1">
        <h2 id={titleId} className="text-[17px] leading-6 font-bold">
          {exercise.name}
        </h2>
        {range ? (
          <span className="shrink-0 text-[15px] text-muted-foreground">
            {range.repMin}–{range.repMax} rép.
          </span>
        ) : null}
      </header>

      <div className="grid grid-cols-[1.5rem_minmax(0,1fr)_0.75rem_minmax(0,0.8fr)_2.75rem_2.75rem] items-center gap-x-2 gap-y-2 sm:grid-cols-[2rem_9rem_1rem_6rem_2.75rem_2.75rem] sm:justify-start">
        <span aria-hidden className="text-[13px] text-muted-foreground">
          N°
        </span>
        <span aria-hidden className="text-[13px] text-muted-foreground">
          Charge (kg)
        </span>
        <span aria-hidden />
        <span aria-hidden className="text-[13px] text-muted-foreground">
          Rép.
        </span>
        <span aria-hidden className="text-center text-[13px] text-muted-foreground">
          Éch.
        </span>
        <span aria-hidden />

        {exercise.sets.map((set, i) => {
          const n = i + 1;
          const invalid = Boolean(errors[set.key]);
          const update = (patch: { weight?: string; reps?: string; isWarmup?: boolean }) =>
            act({ type: "updateSet", exerciseKey: exercise.key, setKey: set.key, patch });
          return (
            <div key={set.key} role="group" aria-label={`Série ${n}`} className="contents">
              <span className="text-[15px] text-muted-foreground tabular-nums">{n}</span>
              <Input
                aria-label={`Charge (kg), série ${n}`}
                aria-invalid={invalid && errors[set.key] === "Charge invalide" ? true : undefined}
                inputMode="decimal"
                autoComplete="off"
                value={set.weight}
                onChange={(e) => update({ weight: e.target.value })}
                className={`${fieldClass} text-right tabular-nums`}
              />
              <span aria-hidden className="text-center text-muted-foreground">
                ×
              </span>
              <Input
                aria-label={`Répétitions, série ${n}`}
                aria-invalid={
                  invalid && errors[set.key] === "Répétitions invalides" ? true : undefined
                }
                inputMode="numeric"
                autoComplete="off"
                value={set.reps}
                onChange={(e) => update({ reps: e.target.value })}
                className={`${fieldClass} text-right tabular-nums`}
              />
              <label className="flex size-11 items-center justify-center">
                <input
                  type="checkbox"
                  aria-label={`Échauffement, série ${n}`}
                  checked={set.isWarmup}
                  onChange={(e) => update({ isWarmup: e.target.checked })}
                  className="size-5 accent-[var(--action)]"
                />
              </label>
              <button
                type="button"
                aria-label={`Supprimer la série ${n}`}
                disabled={exercise.sets.length <= 1}
                onClick={() =>
                  act({ type: "removeSet", exerciseKey: exercise.key, setKey: set.key })
                }
                className="flex size-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted disabled:opacity-30"
              >
                <X aria-hidden className="size-5" strokeWidth={2} />
              </button>
            </div>
          );
        })}
      </div>

      {setErrors.length > 0 ? (
        <ul className="px-1 text-[15px] text-regression-ink">
          {setErrors.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      ) : null}

      {exercise.prefilledFrom ? (
        <p className="px-1 text-[15px] text-muted-foreground">
          Prérempli depuis le {formatDayMonth(exercise.prefilledFrom)}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          variant="ghost"
          className={`${secondaryButtonClass} text-action`}
          onClick={() => act({ type: "addSet", exerciseKey: exercise.key })}
          disabled={exercise.sets.length >= 20}
        >
          <Plus aria-hidden className="size-5" strokeWidth={2} />
          Ajouter une série
        </Button>
        <div className="flex items-center gap-1">
          <IconButton
            label={`Monter ${exercise.name}`}
            disabled={first}
            onClick={() => act({ type: "moveExercise", key: exercise.key, direction: "up" })}
          >
            <ArrowUp aria-hidden className="size-5" strokeWidth={2} />
          </IconButton>
          <IconButton
            label={`Descendre ${exercise.name}`}
            disabled={last}
            onClick={() => act({ type: "moveExercise", key: exercise.key, direction: "down" })}
          >
            <ArrowDown aria-hidden className="size-5" strokeWidth={2} />
          </IconButton>
          <IconButton
            label={`Retirer ${exercise.name}`}
            onClick={() => act({ type: "removeExercise", key: exercise.key })}
          >
            <Trash2 aria-hidden className="size-5" strokeWidth={2} />
          </IconButton>
        </div>
      </div>
    </section>
  );
}

function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex size-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground",
        "disabled:opacity-30 disabled:hover:bg-transparent",
      )}
    >
      {children}
    </button>
  );
}
