"use client";

import {
  EQUIPMENT,
  equipmentLabel,
  formatKg,
  isQuarterKg,
  parseDecimal,
  type Equipment,
  type Exercise,
} from "@maroutine/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useId, useState, type FormEvent } from "react";
import { FormError } from "@/components/form-error";
import { fieldClass, labelClass, primaryButtonClass, selectClass } from "@/components/form-styles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, apiFetch } from "@/lib/api";

// À la création, le pas d'augmentation n'est pas demandé : le serveur prend celui du matériel.
type ExerciseBody = Omit<Exercise, "id" | "archived" | "incrementKg"> & { incrementKg?: number };

const MESSAGES = {
  name: "Donne un nom à l'exercice.",
  repBounds: "Les répétitions vont de 1 à 50.",
  repOrder: "La fourchette doit aller d'un nombre au même ou à un plus grand.",
  step: "Le pas doit être un multiple de 0,25 kg.",
  stepBounds: "Le pas va de 0,25 à 20 kg.",
  duplicate: "Ce nom existe déjà.",
  failed: "Enregistrement impossible. Réessaie.",
};

function parseReps(text: string): number | null {
  if (!/^\d+$/.test(text.trim())) return null;
  const value = Number(text);
  return value >= 1 && value <= 50 ? value : null;
}

// Les mêmes règles que exerciseInputSchema, avec un message lisible pour chaque cas.
function validate(fields: {
  name: string;
  equipment: Equipment;
  repMin: string;
  repMax: string;
  increment: string | null;
}): { ok: true; body: ExerciseBody } | { ok: false; message: string } {
  const name = fields.name.trim();
  if (!name) return { ok: false, message: MESSAGES.name };
  const repMin = parseReps(fields.repMin);
  const repMax = parseReps(fields.repMax);
  if (repMin === null || repMax === null) return { ok: false, message: MESSAGES.repBounds };
  if (repMax < repMin) return { ok: false, message: MESSAGES.repOrder };
  if (fields.increment === null) {
    return { ok: true, body: { name, equipment: fields.equipment, repMin, repMax } };
  }
  const incrementKg = parseDecimal(fields.increment);
  if (incrementKg === null || !isQuarterKg(incrementKg))
    return { ok: false, message: MESSAGES.step };
  if (incrementKg <= 0 || incrementKg > 20) return { ok: false, message: MESSAGES.stepBounds };
  return { ok: true, body: { name, equipment: fields.equipment, repMin, repMax, incrementKg } };
}

export function ExerciseForm({
  initial,
  onSaved,
}: {
  initial?: Exercise;
  onSaved: (exercise: Exercise) => void;
}) {
  const queryClient = useQueryClient();
  // Identifiants uniques : Next.js garde l'écran précédent caché dans le DOM (Activity).
  const id = useId();
  const [name, setName] = useState(initial?.name ?? "");
  const [equipment, setEquipment] = useState<Equipment>(initial?.equipment ?? "barbell");
  const [repMin, setRepMin] = useState(String(initial?.repMin ?? 6));
  const [repMax, setRepMax] = useState(String(initial?.repMax ?? 10));
  // Pas d'augmentation : seulement dans les réglages d'un exercice existant (D16).
  const [increment, setIncrement] = useState(initial ? formatKg(initial.incrementKg) : "");
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: (body: ExerciseBody) =>
      initial
        ? apiFetch<Exercise>(`/api/v1/exercises/${initial.id}`, { method: "PATCH", body })
        : apiFetch<Exercise>("/api/v1/exercises", { method: "POST", body }),
    onSuccess: async (exercise) => {
      await queryClient.invalidateQueries({ queryKey: ["exercises"] });
      queryClient.setQueryData(["exercise", exercise.id], exercise);
      onSaved(exercise);
    },
    onError: (failure) => {
      setError(
        failure instanceof ApiError && failure.status === 409
          ? MESSAGES.duplicate
          : MESSAGES.failed,
      );
    },
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validate({
      name,
      equipment,
      repMin,
      repMax,
      increment: initial ? increment : null,
    });
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setError(null);
    save.mutate(result.body);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-name`} className={labelClass}>
          Nom
        </Label>
        <Input
          id={`${id}-name`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          autoComplete="off"
          className={fieldClass}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-equipment`} className={labelClass}>
          Matériel
        </Label>
        <select
          id={`${id}-equipment`}
          value={equipment}
          onChange={(e) => setEquipment(e.target.value as Equipment)}
          className={selectClass}
        >
          {EQUIPMENT.map((value) => (
            <option key={value} value={value}>
              {equipmentLabel(value)}
            </option>
          ))}
        </select>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className={`${labelClass} mb-2`}>Fourchette cible</legend>
        <div className="flex items-center gap-3">
          <Input
            aria-label="Répétitions minimum"
            inputMode="numeric"
            value={repMin}
            onChange={(e) => setRepMin(e.target.value)}
            className={`${fieldClass} w-20 text-center`}
          />
          <span aria-hidden className="text-muted-foreground">
            à
          </span>
          <Input
            aria-label="Répétitions maximum"
            inputMode="numeric"
            value={repMax}
            onChange={(e) => setRepMax(e.target.value)}
            className={`${fieldClass} w-20 text-center`}
          />
          <span className="text-[15px] text-muted-foreground">répétitions</span>
        </div>
      </fieldset>

      {initial ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-increment`} className={labelClass}>
            Pas d&apos;augmentation (kg)
          </Label>
          <Input
            id={`${id}-increment`}
            aria-describedby={`${id}-increment-help`}
            inputMode="decimal"
            value={increment}
            onChange={(e) => setIncrement(e.target.value)}
            className={`${fieldClass} w-28`}
          />
          <p id={`${id}-increment-help`} className="text-[15px] text-muted-foreground">
            De combien monter la charge quand tu progresses. Sert aux suggestions de charge.
          </p>
        </div>
      ) : null}

      <FormError>{error}</FormError>

      <Button type="submit" disabled={save.isPending} className={`mt-1 ${primaryButtonClass}`}>
        {save.isPending ? "Enregistrement…" : initial ? "Enregistrer" : "Créer l'exercice"}
      </Button>
    </form>
  );
}
