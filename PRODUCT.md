# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

Mobile-first PWA installed on the owner's iPhone, and the same app used on a desktop browser. Both widths are first-class.

## Stack

Next.js (App Router) full-stack TypeScript, Tailwind CSS + shadcn/ui, Recharts, Neon PostgreSQL, Better Auth, Vercel. Decided with the owner; see `docs/adr/0001-stack-technique.md`.

## Users

- **Owner** (primary): one person who lifts at the gym several times a week and, until now, kept everything in their head. Opens the app **in the evening, at home**, after the session, to log the workout, the day's weigh-in and the day's food, then glance at progress.
- **Demo visitor**: recruiters and tech leads who open the read-only demo from a portfolio link, usually once, on desktop or phone.

## Product Purpose

Track gym performance objectively to optimise sessions. Turn logged sets (load × reps) into a comparable progress measure per exercise (estimated max, Epley), suggest the next session's load and reps with stated reasons, and set performance beside nutrition (calories, protein) and body weight to check the owner's hunch that regressions follow periods of less disciplined eating. Success: the evening log takes under 5 minutes, and the owner can see at a glance what is progressing, what is stalling, and whether food explains it.

## Positioning

A lifting log that cross-checks performance against what you ate in the three days before, with transparent rules instead of opaque coaching, and with no subjective "how did it feel" input: only objective numbers.

## Operating Context

- Evening ritual at home, phone in hand (sometimes desktop). Not used mid-workout.
- Portfolio piece for a fullstack developer role: the code, the docs (`docs/`) and the live demo are all evaluated.

## Capabilities and Constraints

- Screens: Tableau de bord, Saisie du soir (séance, pesée, alimentation), Séance, Calendrier, Exercices, Fiche exercice, Poids, Alimentation, Croisement, Réglages. Full list: `docs/architecture.md` §8.
- Vocabulary is fixed by `docs/GLOSSARY.md` (séance, série, max estimé, volume, jour engagé, fenêtre alimentaire…). UI copy is in French.
- No feeling/RPE input, ever. No social features. No AI coaching.
- Budget 0 €. Food data from Open Food Facts (ODbL attribution required).
- Statistical honesty: no comparison shown below 5 distinct sessions per group, descriptive wording only, never causal.

## Brand Commitments

- Name: **MaRoutine**.
- Owner's explicit direction: **minimalist, straight to the essentials, never cluttered**.

## Evidence on Hand

No real data yet. Mockups and the demo use synthetic data, labelled as such. No testimonials, users or metrics exist and none may be invented.

## Product Principles

1. The evening log must be fast: prefill from last time, change only what changed.
2. Numbers, not feelings: every insight traces back to logged load, reps, weight or food.
3. Show the reason: every suggestion and every trend states the rule behind it.
4. Honest about uncertainty: say "not enough data yet" rather than imply a conclusion.
5. Essentials first: one clear answer per screen, detail on demand.

## Accessibility & Inclusion

WCAG AA contrast, keyboard navigable on desktop, touch targets ≥ 44 px, every chart paired with a text summary.
