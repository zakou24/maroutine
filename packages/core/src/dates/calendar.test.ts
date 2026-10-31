import { describe, expect, it } from "vitest";
import { addDays, addMonths, daysBetween, monthGrid, startOfWeek, todayIn } from "./calendar";

describe("todayIn", () => {
  // 31 octobre 2026, 23 h 45 à Paris = 22 h 45 UTC (heure d'hiver) ; 31 mars 2026, 23 h 30 à Paris = 21 h 30 UTC (heure d'été)
  it("une saisie tard le soir reste datée du jour même à Paris (Review Focus 2)", () => {
    expect(todayIn("Europe/Paris", new Date("2026-10-31T22:45:00Z"))).toBe("2026-10-31");
    expect(todayIn("Europe/Paris", new Date("2026-03-31T21:30:00Z"))).toBe("2026-03-31");
  });
  it("passe au lendemain à minuit, heure de Paris", () => {
    expect(todayIn("Europe/Paris", new Date("2026-10-31T23:15:00Z"))).toBe("2026-11-01");
  });
});

describe("addDays et startOfWeek", () => {
  it("change de mois et d'année", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
  it("ramène au lundi", () => {
    expect(startOfWeek("2026-11-01")).toBe("2026-10-26");
    expect(startOfWeek("2026-10-26")).toBe("2026-10-26");
  });
});

describe("monthGrid", () => {
  it("couvre le mois entier en semaines du lundi au dimanche", () => {
    const grid = monthGrid("2026-11");
    expect(grid[0]?.[0]).toBe("2026-10-26");
    expect(grid.at(-1)?.at(-1)).toBe("2026-12-06");
    expect(grid.every((w) => w.length === 7)).toBe(true);
    expect(grid.flat()).toContain("2026-11-30");
  });
  it("un mois qui commence un lundi commence par son 1er", () => {
    expect(monthGrid("2027-02")[0]?.[0]).toBe("2027-02-01");
  });
});

describe("daysBetween", () => {
  it("compte les jours de la première date à la seconde", () => {
    expect(daysBetween("2026-10-01", "2026-10-31")).toBe(30);
    expect(daysBetween("2026-10-31", "2026-10-01")).toBe(-30);
    expect(daysBetween("2026-03-28", "2026-03-30")).toBe(2);
  });
});

describe("addMonths", () => {
  it("passe d'un mois « AAAA-MM » à l'autre, année comprise", () => {
    expect(addMonths("2026-11", 1)).toBe("2026-12");
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2027-01", -1)).toBe("2026-12");
    expect(addMonths("2026-11", -11)).toBe("2025-12");
  });
});
