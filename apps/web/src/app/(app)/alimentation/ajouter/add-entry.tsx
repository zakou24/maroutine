"use client";

import {
  MEALS,
  entryNutrients,
  mealLabel,
  normalizeBarcode,
  parseDecimal,
  toMeal,
  type Food,
  type FoodEntryInput,
  type FoodSearchResponse,
  type Meal,
} from "@maroutine/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, type FormEvent } from "react";
import { Field } from "@/app/(app)/alimentation/journal-screen";
import { FoodForm } from "@/components/food-form";
import { FormError } from "@/components/form-error";
import {
  fieldClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
  selectClass,
} from "@/components/form-styles";
import { LoadError } from "@/components/query-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, apiFetch } from "@/lib/api";
import { formatGrams, formatKcal } from "@/lib/format";
import { invalidateJournal, recentFoodsQuery } from "@/lib/nutrition-queries";
import { cn } from "@/lib/utils";
import { BarcodeScanner } from "./barcode-scanner";

// Temporisation et longueur minimale : la recherche externe est limitée (ADR 0007, T-09).
const DEBOUNCE_MS = 400;
const MIN_QUERY = 2;

type Mode = "search" | "scan" | "quick" | "custom";

function nutrientsLabel(n: { kcal: number; proteinG: number }) {
  return `${formatKcal(n.kcal)} · ${formatGrams(n.proteinG)} de protéines`;
}

export function AddEntry({ date, meal: initialMeal }: { date: string; meal: Meal }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = useId();
  const [meal, setMeal] = useState<Meal>(initialMeal);
  const [mode, setMode] = useState<Mode>("search");
  const [selected, setSelected] = useState<Food | null>(null);
  const [error, setError] = useState<string | null>(null);

  const add = useMutation({
    mutationFn: (body: FoodEntryInput) =>
      apiFetch("/api/v1/food-entries", { method: "POST", body }),
    onSuccess: async () => {
      await invalidateJournal(queryClient);
      // L'écran reste monté (caché) après la navigation : il repart d'une page neuve, sinon un
      // nouvel ajout au même repas reprendrait l'aliment choisi (revue du Lot 4).
      setSelected(null);
      setMode("search");
      setError(null);
      router.push(`/alimentation?date=${date}`);
    },
    onError: () => setError("Ajout impossible. Réessaie."),
  });

  const addLabel = `Ajouter ${toMeal(meal)}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-meal`} className={labelClass}>
          Repas
        </Label>
        <select
          id={`${id}-meal`}
          value={meal}
          onChange={(e) => setMeal(e.target.value as Meal)}
          className={`${selectClass} self-start`}
        >
          {MEALS.map((m) => (
            <option key={m} value={m}>
              {mealLabel(m)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["search", "Rechercher"],
            ["scan", "Scanner"],
            ["quick", "Ajout rapide"],
            ["custom", "Nouvel aliment perso"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={mode === value}
            onClick={() => {
              setMode(value);
              setError(null);
            }}
            className={cn(
              "min-h-11 rounded-lg border border-rule px-3 text-[15px]",
              mode === value
                ? "border-action bg-corridor font-bold text-corridor-ink"
                : "bg-surface hover:bg-muted",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {selected ? (
        <QuantityForm
          food={selected}
          addLabel={addLabel}
          pending={add.isPending}
          onCancel={() => setSelected(null)}
          onAdd={(quantityG) => add.mutate({ eatenOn: date, meal, foodId: selected.id, quantityG })}
        />
      ) : mode === "search" ? (
        <Search onPick={setSelected} />
      ) : mode === "scan" ? (
        <Scan onPick={setSelected} onMode={setMode} />
      ) : mode === "quick" ? (
        <QuickAdd
          addLabel={addLabel}
          pending={add.isPending}
          onAdd={(values) => add.mutate({ eatenOn: date, meal, ...values })}
        />
      ) : (
        <FoodForm submitLabel="Créer l'aliment" onSaved={setSelected} />
      )}
      <FormError>{error}</FormError>
    </div>
  );
}

function FoodButton({
  food,
  onPick,
  recent,
}: {
  food: Food;
  onPick: (food: Food) => void;
  recent?: boolean;
}) {
  const tags = [food.source === "custom" ? "Perso" : null, recent ? "Récent" : null].filter(
    Boolean,
  );
  return (
    <button
      type="button"
      onClick={() => onPick(food)}
      className="flex min-h-14 w-full flex-col items-start px-4 py-2 text-left hover:bg-muted"
    >
      <span className="text-[17px]">
        {food.name}
        {food.brand ? <span className="text-muted-foreground"> · {food.brand}</span> : null}
      </span>
      <span className="text-[15px] text-muted-foreground tabular-nums">
        {formatKcal(food.kcalPer100g)} · {formatGrams(food.proteinPer100g)} de protéines pour 100 g
        {tags.length > 0 ? ` · ${tags.join(" · ")}` : ""}
      </span>
    </button>
  );
}

const SCAN_ERRORS: Record<number, string> = {
  404: "Produit introuvable sur Open Food Facts.",
  429: "Trop de codes d'un coup. Attends une minute.",
  503: "Open Food Facts ne répond pas. Réessaie ou saisis l'aliment.",
};

// Scan du code-barres (D29), ou saisie du code écrit sous les barres si la caméra manque.
function Scan({ onPick, onMode }: { onPick: (food: Food) => void; onMode: (mode: Mode) => void }) {
  const id = useId();
  const [text, setText] = useState("");
  const [error, setError] = useState<{ message: string; notFound: boolean } | null>(null);
  // Un code lu éteint le scanner : après un échec, il ne se rallume qu'à la demande, sinon il
  // relirait en boucle le produit resté devant l'objectif (revue du Lot 4.1).
  const [scanning, setScanning] = useState(true);
  const lookup = useMutation({
    mutationFn: (code: string) => apiFetch<Food>(`/api/v1/foods/barcode/${code}`),
    onSuccess: onPick,
    onError: (failure) => {
      const status = failure instanceof ApiError ? failure.status : 0;
      setError({
        message: SCAN_ERRORS[status] ?? "Recherche impossible. Réessaie.",
        notFound: status === 404,
      });
    },
  });

  function look(raw: string) {
    const code = normalizeBarcode(raw);
    if (!code) {
      setError({ message: "Code-barres invalide.", notFound: false });
      return;
    }
    setError(null);
    lookup.mutate(code);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    look(text);
  }

  return (
    <div className="flex flex-col gap-4">
      {lookup.isPending ? (
        <p className="text-[15px] text-muted-foreground">Recherche du produit…</p>
      ) : scanning ? (
        <BarcodeScanner
          onCode={(code) => {
            setScanning(false);
            setText(code);
            look(code);
          }}
        />
      ) : (
        <Button
          variant="outline"
          className={`${secondaryButtonClass} self-start`}
          onClick={() => {
            setError(null);
            setScanning(true);
          }}
        >
          Scanner à nouveau
        </Button>
      )}
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-2">
        <Label htmlFor={`${id}-code`} className={labelClass}>
          Code-barres
        </Label>
        <div className="flex gap-2">
          <Input
            id={`${id}-code`}
            inputMode="numeric"
            autoComplete="off"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className={`${fieldClass} flex-1 tabular-nums`}
          />
          <Button
            type="submit"
            variant="outline"
            disabled={lookup.isPending}
            className={secondaryButtonClass}
          >
            Chercher le code
          </Button>
        </div>
      </form>
      <FormError>{error?.message ?? null}</FormError>
      {error?.notFound ? (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className={secondaryButtonClass}
            onClick={() => onMode("quick")}
          >
            Ajout rapide
          </Button>
          <Button
            variant="outline"
            className={secondaryButtonClass}
            onClick={() => onMode("custom")}
          >
            Créer l&apos;aliment
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function Search({ onPick }: { onPick: (food: Food) => void }) {
  const id = useId();
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setQuery(text.trim()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text]);
  const active = query.length >= MIN_QUERY;
  const results = useQuery({
    queryKey: ["food-search", query],
    queryFn: () =>
      apiFetch<FoodSearchResponse>(`/api/v1/foods/search?q=${encodeURIComponent(query)}`),
    enabled: active,
    staleTime: 60_000,
  });
  const recents = useQuery({ ...recentFoodsQuery, enabled: !text.trim() });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-q`} className={labelClass}>
          Rechercher un aliment
        </Label>
        <Input
          id={`${id}-q`}
          type="search"
          autoComplete="off"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className={fieldClass}
        />
      </div>
      {!text.trim() ? (
        recents.data && recents.data.length > 0 ? (
          <>
            <h2 id={`${id}-recent`} className="text-[17px] font-bold">
              Récents
            </h2>
            <ul
              aria-labelledby={`${id}-recent`}
              className="divide-y divide-rule overflow-hidden rounded-xl border border-rule bg-surface"
            >
              {recents.data.map((food) => (
                <li key={food.id}>
                  <FoodButton food={food} onPick={onPick} />
                </li>
              ))}
            </ul>
          </>
        ) : null
      ) : active ? (
        results.isError ? (
          <LoadError message="Recherche impossible." onRetry={() => results.refetch()} />
        ) : results.data ? (
          <>
            {results.data.offUnavailable ? (
              <p
                role="status"
                className="rounded-xl bg-corridor px-4 py-3 text-[15px] text-corridor-ink"
              >
                Open Food Facts ne répond pas : seuls tes aliments sont affichés.
              </p>
            ) : null}
            {results.data.results.length > 0 ? (
              <ul
                aria-label="Résultats"
                className="divide-y divide-rule overflow-hidden rounded-xl border border-rule bg-surface"
              >
                {results.data.results.map((food) => (
                  <li key={food.id}>
                    <FoodButton food={food} recent={food.recent} onPick={onPick} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[15px] text-muted-foreground">
                Aucun aliment trouvé. Essaie un autre mot, un ajout rapide ou un aliment perso.
              </p>
            )}
            <p className="text-[13px] text-muted-foreground">
              Données{" "}
              <a href="https://world.openfoodfacts.org" className="underline underline-offset-4">
                Open Food Facts
              </a>
              , licence ODbL.
            </p>
          </>
        ) : (
          <p className="text-[15px] text-muted-foreground">Recherche…</p>
        )
      ) : null}
    </div>
  );
}

function QuantityForm({
  food,
  addLabel,
  pending,
  onAdd,
  onCancel,
}: {
  food: Food;
  addLabel: string;
  pending: boolean;
  onAdd: (quantityG: number) => void;
  onCancel: () => void;
}) {
  const id = useId();
  const [quantity, setQuantity] = useState("100");
  const [error, setError] = useState<string | null>(null);
  const value = parseDecimal(quantity);
  const valid = value !== null && value >= 1 && value <= 5000;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!valid) return setError("La quantité va de 1 à 5 000 g.");
    onAdd(value);
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col gap-3 rounded-xl border border-rule bg-surface px-4 py-4"
    >
      <p className="text-[17px] font-bold">
        {food.name}
        {food.brand ? (
          <span className="font-normal text-muted-foreground"> · {food.brand}</span>
        ) : null}
      </p>
      <Field
        id={`${id}-qty`}
        label="Quantité (g)"
        value={quantity}
        onChange={setQuantity}
        numeric
      />
      {valid ? (
        <p className="text-[15px] text-corridor-ink tabular-nums">
          {nutrientsLabel(entryNutrients(food, value))}
        </p>
      ) : null}
      <FormError>{error}</FormError>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending} className={primaryButtonClass}>
          {addLabel}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} className={secondaryButtonClass}>
          Changer d&apos;aliment
        </Button>
      </div>
    </form>
  );
}

function QuickAdd({
  addLabel,
  pending,
  onAdd,
}: {
  addLabel: string;
  pending: boolean;
  onAdd: (values: { label: string; kcal: number; proteinG: number }) => void;
}) {
  const id = useId();
  const [label, setLabel] = useState("");
  const [kcal, setKcal] = useState("");
  const [protein, setProtein] = useState("");
  const [error, setError] = useState<string | null>(null);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!label.trim()) return setError("Donne un libellé.");
    const k = parseDecimal(kcal);
    const p = protein.trim() ? parseDecimal(protein) : 0;
    if (k === null || k > 5000) return setError("Les calories vont de 0 à 5 000 kcal.");
    if (p === null || p > 500) return setError("Les protéines vont de 0 à 500 g.");
    setError(null);
    onAdd({ label: label.trim(), kcal: k, proteinG: p });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        <Field id={`${id}-label`} label="Libellé" value={label} onChange={setLabel} wide />
        <Field id={`${id}-kcal`} label="Calories (kcal)" value={kcal} onChange={setKcal} numeric />
        <Field
          id={`${id}-prot`}
          label="Protéines (g)"
          value={protein}
          onChange={setProtein}
          numeric
        />
      </div>
      <FormError>{error}</FormError>
      <Button type="submit" disabled={pending} className={`${primaryButtonClass} self-start`}>
        {addLabel}
      </Button>
    </form>
  );
}
