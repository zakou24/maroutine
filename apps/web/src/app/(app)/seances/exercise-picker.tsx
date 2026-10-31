"use client";

import type { Exercise } from "@maroutine/core";
import { Plus } from "lucide-react";
import { useState } from "react";
import { secondaryButtonClass } from "@/components/form-styles";
import { Button } from "@/components/ui/button";
import { ExerciseForm } from "../exercices/exercise-form";

// Choix d'un exercice à ajouter à la séance, déplié sur place (pas de fenêtre modale).
export function ExercisePicker({
  available,
  disabled,
  onPick,
}: {
  available: Exercise[];
  disabled?: boolean;
  onPick: (exercise: Exercise) => void;
}) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  function pick(exercise: Exercise) {
    setOpen(false);
    setCreating(false);
    onPick(exercise);
  }

  if (!open) {
    return (
      <Button
        variant="outline"
        className={`${secondaryButtonClass} w-full border-dashed border-input bg-surface font-bold text-action`}
        disabled={disabled}
        onClick={() => setOpen(true)}
        aria-expanded={false}
      >
        <Plus aria-hidden className="size-5" strokeWidth={2} />
        Ajouter un exercice
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-rule bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[17px] font-bold">Ajouter un exercice</h2>
        <Button
          variant="ghost"
          className={secondaryButtonClass}
          onClick={() => {
            setOpen(false);
            setCreating(false);
          }}
        >
          Fermer
        </Button>
      </div>
      {creating ? (
        <ExerciseForm onSaved={pick} />
      ) : (
        <>
          {available.length === 0 ? (
            <p className="text-[15px] text-muted-foreground">
              Tous tes exercices sont déjà dans la séance.
            </p>
          ) : (
            <ul aria-label="Exercices disponibles" className="flex flex-col gap-2">
              {available.map((exercise) => (
                <li key={exercise.id}>
                  <Button
                    variant="outline"
                    className="h-11 w-full justify-start rounded-lg px-4 text-[17px]"
                    onClick={() => pick(exercise)}
                  >
                    {exercise.name}
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <Button
            variant="ghost"
            className={`${secondaryButtonClass} self-start text-action`}
            onClick={() => setCreating(true)}
          >
            <Plus aria-hidden className="size-5" strokeWidth={2} />
            Créer un exercice
          </Button>
        </>
      )}
    </div>
  );
}
