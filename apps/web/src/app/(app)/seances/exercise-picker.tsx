"use client";

import {
  MUSCLE_GROUPS,
  muscleGroupLabel,
  type CatalogExercise,
  type Exercise,
} from "@maroutine/core";
import { ChevronRight, Plus, Search } from "lucide-react";
import { useId, useState } from "react";
import { fieldClass, secondaryButtonClass } from "@/components/form-styles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExerciseForm } from "../exercices/exercise-form";

// Comparaison sans casse ni accents : « developpe » trouve « Développé ».
function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

const pickButton = "h-11 w-full justify-start rounded-lg px-4 text-[17px]";

// Choix d'un exercice à ajouter à la séance, déplié sur place : tes exercices, puis le catalogue (D16).
export function ExercisePicker({
  available,
  catalog,
  disabled,
  onPick,
  onPickCatalog,
}: {
  available: Exercise[];
  catalog: readonly CatalogExercise[];
  disabled?: boolean;
  onPick: (exercise: Exercise) => void;
  onPickCatalog: (entry: CatalogExercise) => void;
}) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const catalogTitleId = useId();

  function close() {
    setOpen(false);
    setCreating(false);
    setQuery("");
    setOpenGroup(null);
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

  const needle = normalize(query.trim());
  const matches = (name: string) => needle === "" || normalize(name).includes(needle);
  const mine = available.filter((e) => matches(e.name));
  const fromCatalog = catalog.filter((e) => matches(e.name));

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-rule bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[17px] font-bold">Ajouter un exercice</h2>
        <Button variant="ghost" className={secondaryButtonClass} onClick={close}>
          Fermer
        </Button>
      </div>
      {creating ? (
        <ExerciseForm
          onSaved={(exercise) => {
            close();
            onPick(exercise);
          }}
        />
      ) : (
        <>
          <div className="relative">
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground"
              strokeWidth={2}
            />
            <Input
              type="search"
              aria-label="Rechercher un exercice"
              placeholder="Rechercher"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={`${fieldClass} pl-10`}
            />
          </div>

          {mine.length > 0 ? (
            <ul aria-label="Tes exercices" className="flex flex-col gap-2">
              {mine.map((exercise) => (
                <li key={exercise.id}>
                  <Button
                    variant="outline"
                    className={pickButton}
                    disabled={disabled}
                    onClick={() => {
                      close();
                      onPick(exercise);
                    }}
                  >
                    {exercise.name}
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}

          {fromCatalog.length > 0 ? (
            <section aria-labelledby={catalogTitleId} className="flex flex-col gap-3">
              <h3 id={catalogTitleId} className="text-[15px] font-bold text-muted-foreground">
                Catalogue
              </h3>
              {MUSCLE_GROUPS.map((group) => {
                const entries = fromCatalog.filter((e) => e.group === group);
                if (entries.length === 0) return null;
                // Replié par groupe tant qu'on ne cherche pas : 40 exercices d'un bloc, c'est trop.
                const expanded = needle !== "" || openGroup === group;
                return (
                  <div key={group} className="flex flex-col gap-2">
                    {needle === "" ? (
                      <button
                        type="button"
                        aria-expanded={expanded}
                        onClick={() => setOpenGroup(expanded ? null : group)}
                        className="flex min-h-11 items-center gap-2 rounded-lg px-1 text-left text-[15px] hover:bg-muted"
                      >
                        <ChevronRight
                          aria-hidden
                          className={`size-4 text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`}
                          strokeWidth={2}
                        />
                        <span className="flex-1">{muscleGroupLabel(group)}</span>
                        <span className="text-muted-foreground tabular-nums">{entries.length}</span>
                      </button>
                    ) : (
                      <h4 className="text-[13px] text-muted-foreground">
                        {muscleGroupLabel(group)}
                      </h4>
                    )}
                    {expanded ? (
                      <ul className="flex flex-col gap-2">
                        {entries.map((entry) => (
                          <li key={entry.name}>
                            <Button
                              variant="outline"
                              className={pickButton}
                              disabled={disabled}
                              onClick={() => {
                                close();
                                onPickCatalog(entry);
                              }}
                            >
                              {entry.name}
                            </Button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                );
              })}
            </section>
          ) : null}

          {mine.length === 0 && fromCatalog.length === 0 ? (
            <p className="text-[15px] text-muted-foreground">Aucun exercice ne correspond.</p>
          ) : null}

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
