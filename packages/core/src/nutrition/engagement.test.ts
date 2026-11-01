import { describe, expect, it } from "vitest";
import { dayStatus, dayStatusLabel, windowDays, windowStatus } from "./engagement";

const target = { kcal: 2400, proteinG: 150 };
const day = (kcal: number, proteinG: number, entryCount = 3) => ({ kcal, proteinG, entryCount });

describe("dayStatus (§6.7)", () => {
  it("sans entrée : non renseigné, même avec un objectif", () => {
    expect(dayStatus(day(0, 0, 0), target)).toBe("unrecorded");
    expect(dayStatus(day(0, 0, 0), null)).toBe("unrecorded");
  });

  it("des entrées sans objectif : non évalué", () => {
    expect(dayStatus(day(2400, 150), null)).toBe("unrated");
  });

  it("engagé aux bornes : 90 % des protéines, 90 % et 110 % des calories", () => {
    expect(dayStatus(day(2160, 135), target)).toBe("engaged");
    expect(dayStatus(day(2640, 200), target)).toBe("engaged");
  });

  it("non engagé hors des bornes", () => {
    expect(dayStatus(day(2641, 150), target)).toBe("notEngaged");
    expect(dayStatus(day(2159, 150), target)).toBe("notEngaged");
    expect(dayStatus(day(2400, 134.9), target)).toBe("notEngaged");
  });

  it("nomme chaque statut", () => {
    expect(
      (["unrecorded", "unrated", "engaged", "notEngaged"] as const).map(dayStatusLabel),
    ).toEqual(["Non renseigné", "Non évalué", "Engagé", "Non engagé"]);
  });
});

describe("fenêtre alimentaire (§6.8)", () => {
  it("couvre J-3, J-2 et J-1", () => {
    expect(windowDays("2026-11-02")).toEqual(["2026-10-30", "2026-10-31", "2026-11-01"]);
  });

  it("engagée si au moins 2/3 des jours classés sont engagés", () => {
    expect(windowStatus(["engaged", "engaged", "unrecorded"])).toBe("engaged");
    expect(windowStatus(["engaged", "engaged", "notEngaged"])).toBe("engaged");
    expect(windowStatus(["engaged", "engaged", "engaged"])).toBe("engaged");
  });

  it("non engagée sinon", () => {
    expect(windowStatus(["engaged", "notEngaged", "notEngaged"])).toBe("notEngaged");
    expect(windowStatus(["engaged", "notEngaged", "unrated"])).toBe("notEngaged");
  });

  it("non classée sous 2 jours classés : un jour non évalué ne compte pas", () => {
    expect(windowStatus(["engaged", "unrated", "unrecorded"])).toBeNull();
    expect(windowStatus(["unrecorded", "unrecorded", "unrecorded"])).toBeNull();
  });
});
