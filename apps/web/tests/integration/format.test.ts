import { expect, it } from "vitest";
import { formatDayMonth, formatDayMonthLong, formatLongDate, formatShortDate } from "@/lib/format";

it("écrit les dates en français, « 1er » pour le premier du mois", () => {
  expect(formatDayMonth("2026-10-30")).toBe("30 oct.");
  expect(formatDayMonthLong("2026-11-01")).toBe("1er novembre");
  expect(formatDayMonthLong("2026-11-11")).toBe("11 novembre");
  expect(formatLongDate("2026-11-01")).toBe("dimanche 1er novembre");
  expect(formatShortDate("2026-10-31")).toBe("sam. 31 oct.");
});
