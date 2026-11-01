"use client";

import {
  MEALS,
  addDays,
  dayTotals,
  mealLabel,
  parseDecimal,
  toMeal,
  type FoodEntry,
  type FoodEntryPatch,
  type Meal,
} from "@maroutine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { FormError } from "@/components/form-error";
import { fieldClass, labelClass, secondaryButtonClass } from "@/components/form-styles";
import { LoadError, Loading } from "@/components/query-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api";
import { formatGrams, formatKcal, formatLongDate } from "@/lib/format";
import { invalidateJournal, journalQuery } from "@/lib/nutrition-queries";
import { useToday } from "@/lib/use-today";
import { CopyForm } from "./copy-form";

const iconButton =
  "flex size-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground";

// La date vient de l'URL (?date=), pour que l'ajout d'une entrée revienne au même jour.
export function JournalScreen() {
  const today = useToday();
  const router = useRouter();
  const params = useSearchParams();
  if (today === null) return <Loading />;
  const asked = params.get("date");
  const date = asked && /^\d{4}-\d{2}-\d{2}$/.test(asked) && asked <= today ? asked : today;
  return (
    <JournalView
      date={date}
      today={today}
      onDateChange={(next) => router.replace(`/alimentation?date=${next}`)}
    />
  );
}

export function JournalView({
  date,
  today,
  onDateChange,
}: {
  date: string;
  today: string;
  onDateChange: (date: string) => void;
}) {
  const journal = useQuery(journalQuery(date));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          aria-label="Jour précédent"
          onClick={() => onDateChange(addDays(date, -1))}
          className={iconButton}
        >
          <ChevronLeft aria-hidden className="size-6" strokeWidth={2} />
        </button>
        <h2 className="text-[20px] leading-7 font-bold first-letter:uppercase" aria-live="polite">
          {date === today ? "Aujourd'hui" : formatLongDate(date)}
        </h2>
        <button
          type="button"
          aria-label="Jour suivant"
          disabled={date >= today}
          onClick={() => onDateChange(addDays(date, 1))}
          className={`${iconButton} disabled:invisible`}
        >
          <ChevronRight aria-hidden className="size-6" strokeWidth={2} />
        </button>
      </div>

      {journal.isPending ? (
        <Loading />
      ) : journal.isError ? (
        <LoadError message="Impossible de charger le journal." onRetry={() => journal.refetch()} />
      ) : (
        <>
          <Targets totals={journal.data.totals} target={journal.data.target} />
          {MEALS.map((meal) => (
            <MealSection
              key={meal}
              date={date}
              meal={meal}
              entries={journal.data.entries.filter((e) => e.meal === meal)}
            />
          ))}
          <CopyForm date={date} />
        </>
      )}
    </div>
  );
}

function Bar({ value, max }: { value: number; max: number }) {
  const ratio = max > 0 ? Math.min(value / max, 1) : 0;
  return (
    <div aria-hidden className="h-2 overflow-hidden rounded-full bg-rule-soft">
      {/* Un dépassement reste bleu : l'orange est réservé aux régressions (D13). */}
      <div className="h-full rounded-full bg-action" style={{ width: `${ratio * 100}%` }} />
    </div>
  );
}

function Targets({
  totals,
  target,
}: {
  totals: { kcal: number; proteinG: number };
  target: { kcal: number; proteinG: number } | null;
}) {
  if (!target) {
    return (
      <section className="flex flex-col gap-1 rounded-xl border border-rule bg-surface px-4 py-3">
        <p className="text-[17px] tabular-nums">
          {formatKcal(totals.kcal)} · {formatGrams(totals.proteinG)} de protéines
        </p>
        <p className="text-[15px] text-muted-foreground">
          Pas d&apos;objectif pour ce jour.{" "}
          <Link href="/objectifs" className="text-action underline underline-offset-4">
            Définir mes objectifs
          </Link>
        </p>
      </section>
    );
  }
  return (
    <section
      aria-label="Objectifs du jour"
      className="flex flex-col gap-3 rounded-xl border border-rule bg-surface px-4 py-3"
    >
      <div className="flex flex-col gap-1.5">
        <p className="text-[17px] tabular-nums">
          {`${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(totals.kcal)} / ${formatKcal(target.kcal)}`}
        </p>
        <Bar value={totals.kcal} max={target.kcal} />
      </div>
      <div className="flex flex-col gap-1.5">
        <p className="text-[17px] tabular-nums">
          {`${formatGrams(totals.proteinG).replace(" g", "")} / ${formatGrams(target.proteinG)} de protéines`}
        </p>
        <Bar value={totals.proteinG} max={target.proteinG} />
      </div>
    </section>
  );
}

function entryDetail(entry: FoodEntry): string {
  const values = `${formatKcal(entry.kcal)} · ${formatGrams(entry.proteinG)} de protéines`;
  return entry.quantityG === null ? values : `${formatGrams(entry.quantityG)} · ${values}`;
}

function MealSection({ date, meal, entries }: { date: string; meal: Meal; entries: FoodEntry[] }) {
  const id = useId();
  const totals = dayTotals(entries);
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <h2 id={id} className="text-[17px] font-bold">
          {mealLabel(meal)}
        </h2>
        {entries.length > 0 ? (
          <span className="text-[15px] text-muted-foreground tabular-nums">
            {formatKcal(totals.kcal)} · {formatGrams(totals.proteinG)}
          </span>
        ) : null}
      </div>
      {entries.length > 0 ? (
        <ul className="divide-y divide-rule overflow-hidden rounded-xl border border-rule bg-surface">
          {entries.map((entry) => (
            <EntryRow key={entry.id} entry={entry} />
          ))}
        </ul>
      ) : null}
      <Link
        href={`/alimentation/ajouter?date=${date}&meal=${meal}`}
        className="inline-flex min-h-11 items-center gap-2 self-start rounded-lg px-2 text-[15px] font-bold text-action hover:bg-muted"
      >
        <Plus aria-hidden className="size-5" strokeWidth={2} />
        Ajouter <span className="sr-only">{toMeal(meal)}</span>
      </Link>
    </section>
  );
}

function EntryRow({ entry }: { entry: FoodEntry }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const remove = useMutation({
    mutationFn: () => apiFetch<void>(`/api/v1/food-entries/${entry.id}`, { method: "DELETE" }),
    onSuccess: () => invalidateJournal(queryClient),
    onError: () => setError("Suppression impossible. Réessaie."),
  });

  if (editing) {
    return (
      <li className="px-4 py-3">
        <EntryEditor entry={entry} onDone={() => setEditing(false)} />
      </li>
    );
  }
  return (
    <li className="flex min-h-14 items-center gap-1 py-2 pr-1 pl-4">
      <span className="flex flex-1 flex-col">
        <span className="text-[17px]">{entry.label}</span>
        <span className="text-[15px] text-muted-foreground tabular-nums">{entryDetail(entry)}</span>
        <FormError>{error}</FormError>
      </span>
      <button
        type="button"
        aria-label={`Modifier ${entry.label}`}
        onClick={() => setEditing(true)}
        className={iconButton}
      >
        <Pencil aria-hidden className="size-5" strokeWidth={2} />
      </button>
      <button
        type="button"
        aria-label={`Supprimer ${entry.label}`}
        disabled={remove.isPending}
        onClick={() => remove.mutate()}
        className={iconButton}
      >
        <Trash2 aria-hidden className="size-5" strokeWidth={2} />
      </button>
    </li>
  );
}

const fmt = (n: number) => String(n).replace(".", ",");

// Modification en place : la quantité d'une entrée avec aliment, ou les valeurs d'un ajout rapide.
function EntryEditor({ entry, onDone }: { entry: FoodEntry; onDone: () => void }) {
  const queryClient = useQueryClient();
  const id = useId();
  const quick = entry.quantityG === null;
  const [quantity, setQuantity] = useState(quick ? "" : fmt(entry.quantityG!));
  const [label, setLabel] = useState(entry.label);
  const [kcal, setKcal] = useState(fmt(entry.kcal));
  const [protein, setProtein] = useState(fmt(entry.proteinG));
  const [error, setError] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: (body: FoodEntryPatch) =>
      apiFetch(`/api/v1/food-entries/${entry.id}`, { method: "PATCH", body }),
    onSuccess: async () => {
      await invalidateJournal(queryClient);
      onDone();
    },
    onError: () => setError("Enregistrement impossible. Réessaie."),
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!quick) {
      const quantityG = parseDecimal(quantity);
      if (quantityG === null || quantityG < 1 || quantityG > 5000) {
        return setError("La quantité va de 1 à 5 000 g.");
      }
      return save.mutate({ quantityG });
    }
    const k = parseDecimal(kcal);
    const p = parseDecimal(protein);
    if (!label.trim()) return setError("Donne un libellé.");
    if (k === null || p === null || k > 5000 || p > 500) {
      return setError("Calories de 0 à 5 000, protéines de 0 à 500 g.");
    }
    save.mutate({ label: label.trim(), kcal: k, proteinG: p });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
      <p className="text-[17px] font-bold">{entry.label}</p>
      <div className="flex flex-wrap gap-3">
        {quick ? (
          <>
            <Field id={`${id}-label`} label="Libellé" value={label} onChange={setLabel} wide />
            <Field
              id={`${id}-kcal`}
              label="Calories (kcal)"
              value={kcal}
              onChange={setKcal}
              numeric
            />
            <Field
              id={`${id}-prot`}
              label="Protéines (g)"
              value={protein}
              onChange={setProtein}
              numeric
            />
          </>
        ) : (
          <Field
            id={`${id}-qty`}
            label="Quantité (g)"
            value={quantity}
            onChange={setQuantity}
            numeric
          />
        )}
      </div>
      <FormError>{error}</FormError>
      <div className="flex gap-2">
        <Button type="submit" disabled={save.isPending} className={secondaryButtonClass}>
          Enregistrer
        </Button>
        <Button type="button" variant="ghost" onClick={onDone} className={secondaryButtonClass}>
          Annuler
        </Button>
      </div>
    </form>
  );
}

export function Field({
  id,
  label,
  value,
  onChange,
  numeric = false,
  wide = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  numeric?: boolean;
  wide?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id} className={labelClass}>
        {label}
      </Label>
      <Input
        id={id}
        inputMode={numeric ? "decimal" : undefined}
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${fieldClass} ${wide ? "w-full sm:w-64" : "w-28"} tabular-nums`}
      />
    </div>
  );
}
