import { describe, expect, it } from "vitest";
import {
  CLASS_IDS,
  MAX_LEVEL,
  STAT_IDS,
  bonusPercent,
  canUpgrade,
  classTotal,
  cumulativeStatCost,
  deficitFor,
  emptyLevels,
  guardianPointsAfterReset,
  hoursUntilAffordable,
  isMilestone,
  remainingPoints,
  sanitizeLevel,
  targetDate,
  totalPlannedCost,
  unlockedCap,
  upgradeCost,
  type Levels,
} from "./mastery";

function totals(w: number, r: number, t: number, s: number): Levels {
  const x = emptyLevels();
  for (const [index, c] of CLASS_IDS.entries()) {
    const total = [w, r, t, s][index];
    x[c].atk = Math.min(total, 50);
    x[c].hp = Math.max(0, total - 50);
  }
  return x;
}

describe("mastery engine", () => {
  it.each([
    [0, 0, 0, 0, 10],
    [10, 0, 0, 0, 10],
    [10, 10, 10, 9, 10],
    [10, 10, 10, 10, 20],
    [29, 20, 20, 20, 30],
    [100, 100, 100, 92, 100],
    [100, 100, 100, 100, 110],
  ])("calculates cap", (w, r, t, s, cap) =>
    expect(unlockedCap(totals(w, r, t, s))).toBe(cap),
  );
  it("calculates totals independently of stat distribution", () => {
    const x = emptyLevels();
    x.warrior.atk = 51;
    x.warrior.skillDamage = 49;
    expect(classTotal(x, "warrior")).toBe(100);
  });
  it("blocks and unlocks the critical 10-to-11 gate", () => {
    const x = totals(10, 10, 10, 9);
    expect(canUpgrade(x, "warrior", "atk")).toMatchObject({
      allowed: false,
      reason: "mastery-locked",
    });
    expect(canUpgrade(x, "support", "atk")).toMatchObject({ allowed: true });
    x.support.atk = 10;
    expect(canUpgrade(x, "warrior", "atk")).toMatchObject({ allowed: true });
  });
  it("allows 29 to 30 and blocks 30 to 31", () => {
    const x = totals(29, 20, 20, 20);
    expect(canUpgrade(x, "warrior", "atk").allowed).toBe(true);
    x.warrior.atk = 30;
    expect(canUpgrade(x, "warrior", "atk").allowed).toBe(false);
  });
  it.each([
    [46, 2000000],
    [47, 2080000],
    [48, 2160000],
    [49, 2240000],
    [50, 2320000],
    [51, 4000000],
    [52, 4200000],
    [53, 4400000],
    [54, 4600000],
    [55, 4800000],
    [56, 5000000],
    [57, 5200000],
    [58, 5400000],
    [59, 5600000],
    [60, 5800000],
    [61, 10000000],
    [62, 10500000],
    [63, 11000000],
    [64, 11500000],
  ])("matches the observed cost for level %i", (level, cost) => {
    expect(upgradeCost(level)).toBe(cost);
  });
  it("caps individual levels at 64", () => {
    expect(MAX_LEVEL).toBe(64);
    expect(upgradeCost(65)).toBeNull();
    expect(upgradeCost(90)).toBeNull();
    expect(sanitizeLevel(65)).toBe(64);
    const x = emptyLevels();
    for (const c of CLASS_IDS) x[c].atk = 64;
    expect(canUpgrade(x, "warrior", "atk")).toEqual({
      allowed: false,
      reason: "cost-unavailable",
    });
    expect(canUpgrade(x, "warrior", "hp")).toMatchObject({ allowed: true });
  });
  it.each([
    [11, true],
    [21, true],
    [31, true],
    [10, false],
    [20, false],
    [1, false],
  ])("detects milestones", (level, expected) =>
    expect(isMilestone(level)).toBe(expected),
  );
  it.each([
    ["atk", 10, 1],
    ["atk", 11, 2.1],
    ["hp", 20, 3],
    ["def", 21, 4.1],
    ["skillDamage", 10, 2],
    ["skillDamage", 11, 4.2],
    ["skillDamage", 20, 6],
    ["skillDamage", 21, 8.2],
  ] as const)("calculates bonuses", (stat, level, bonus) =>
    expect(bonusPercent(stat, level)).toBe(bonus),
  );
  it("looks up costs independent of class/stat", () =>
    expect(upgradeCost(31)).toBe(640000));
  it("calculates cumulative cost and exact undo refund", () => {
    expect(cumulativeStatCost(40, 42)).toBe(3280000);
    expect(cumulativeStatCost(40, 41)).toBe(1600000);
  });
  it("calculates total planned cost", () => {
    const i = emptyLevels(),
      p = emptyLevels();
    i.warrior.atk = p.warrior.atk = 40;
    p.warrior.atk = 42;
    expect(totalPlannedCost(i, p)).toBe(3280000);
  });
  it("keeps unspent points unchanged when there are no levels to refund", () => {
    expect(guardianPointsAfterReset(emptyLevels(), 4321)).toBe(4321);
    expect(guardianPointsAfterReset(emptyLevels(), 0)).toBe(0);
  });
  it("refunds cumulative spending in all 16 fields without changing levels", () => {
    const current = emptyLevels();
    let level = 1;
    for (const c of CLASS_IDS)
      for (const s of STAT_IDS) current[c][s] = level++;
    const original = structuredClone(current);
    // Levels 1–10 refund 5,060,000 combined; levels 11–16 refund 9,520,000.
    expect(guardianPointsAfterReset(current, 420000)).toBe(15000000);
    expect(current).toEqual(original);
  });
  it("includes every purchase through level 64 in a full reset", () => {
    const current = emptyLevels();
    for (const c of CLASS_IDS) for (const s of STAT_IDS) current[c][s] = 64;
    expect(cumulativeStatCost(0, 64)).toBe(126300000);
    expect(guardianPointsAfterReset(current, 1200000)).toBe(2022000000);
  });
  it("allows negative GP and calculates deficit", () => {
    const remaining = remainingPoints(1000000, 1600000);
    expect(remaining).toBe(-600000);
    expect(deficitFor(remaining)).toBe(600000);
  });
  it("handles zero income", () =>
    expect(hoursUntilAffordable(600000, 0)).toBeNull());
  it("calculates hours and target date", () => {
    expect(hoursUntilAffordable(600000, 10000)).toBe(60);
    const now = new Date("2026-08-27T10:00:00Z");
    expect(targetDate(now, 600000, 10000)?.toISOString()).toBe(
      "2026-08-29T22:00:00.000Z",
    );
  });
});
