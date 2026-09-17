import { describe, expect, it } from "vitest";
import {
  CLASS_IDS,
  STAT_IDS,
  MAX_LEVEL,
  canUpgrade,
  classTotal,
  cumulativeStatCost,
  editPlan,
  emptyLevels,
  isLegalDistribution,
  isLevels,
  optimizeTarget,
  routeStages,
  targetDate,
  totalPlannedCost,
  unlockedCap,
  upgradeCost,
} from "./mastery";

describe("plan invariants", () => {
  it("does not return an invalid calendar date for extreme valid targets", () => {
    expect(targetDate(new Date(), 20442800000, 1)).toBeNull();
  });
  it("rejects reductions that remove another class's prerequisite, without mutation", () => {
    const initial = emptyLevels(),
      plan = emptyLevels();
    for (const c of CLASS_IDS) plan[c].atk = 10;
    plan.warrior.atk = 11;
    const blocked = editPlan(initial, plan, "ranged", "atk", 9);
    expect(blocked.message).toContain("prerequisite");
    expect(blocked.plan).toEqual(plan);
    const allowed = editPlan(initial, plan, "warrior", "atk", 10);
    expect(
      isLegalDistribution(
        editPlan(initial, allowed.plan, "ranged", "atk", 9).plan,
      ),
    ).toBe(true);
  });
  it("respects account floors and the next shared cap", () => {
    const initial = emptyLevels();
    initial.warrior.atk = 5;
    expect(
      editPlan(initial, initial, "warrior", "atk", 0).plan.warrior.atk,
    ).toBe(5);
    const result = editPlan(initial, initial, "warrior", "atk", 51);
    expect(result.plan.warrior.atk).toBe(10);
    expect(result.message).toContain("gate");
  });
  it.each([null, {}, [], { warrior: {} }])(
    "rejects malformed level maps",
    (value) => expect(isLevels(value)).toBe(false),
  );
  it.each([-1, 1.5, NaN, Infinity, 91])(
    "rejects invalid account levels",
    (value) => {
      const levels = emptyLevels();
      levels.warrior.atk = value;
      expect(isLegalDistribution(levels)).toBe(false);
    },
  );
  it("rejects an invalid account before optimizing", () => {
    const levels = emptyLevels();
    levels.warrior.atk = 21;
    expect(optimizeTarget(levels, emptyLevels())).toMatchObject({
      steps: [],
      cost: 0,
      error: expect.any(String),
    });
  });
});

describe("optimizer", () => {
  it("adapts an old preset to an advanced account, including missing prerequisites", () => {
    const initial = emptyLevels();
    for (const c of CLASS_IDS) initial[c].atk = 20;
    const preset = structuredClone(initial);
    preset.warrior.atk = 0;
    preset.warrior.hp = 20;
    const result = optimizeTarget(initial, preset);
    expect(result.error).toBeUndefined();
    expect(result.cost).toBe(5484000);
    expect(result.plan.warrior).toEqual({
      atk: 20,
      hp: 20,
      def: 0,
      skillDamage: 0,
    });
    expect(isLegalDistribution(result.plan)).toBe(true);
    expect(initial.warrior.hp).toBe(0);
    expect(preset.warrior.atk).toBe(0);
  });
  it("groups route purchases by their pre-purchase mastery gate", () => {
    const initial = emptyLevels(),
      requested = emptyLevels();
    requested.warrior.atk = 11;
    const result = optimizeTarget(initial, requested),
      stages = routeStages(initial, result.steps);
    expect(stages).toHaveLength(2);
    expect(stages[0]).toMatchObject({
      cap: 10,
      cost: 3476000,
      cumulativeCost: 3476000,
      targetCount: 10,
      unlockCount: 30,
      resultingCap: 20,
    });
    expect(stages[1]).toMatchObject({
      cap: 20,
      cost: 160000,
      cumulativeCost: 3636000,
    });
    expect(stages.flatMap((s) => s.steps)).toEqual(result.steps);
  });
  it("supports every stat at 90 and completes below the guard limit", () => {
    const requested = emptyLevels();
    for (const c of CLASS_IDS)
      for (const s of STAT_IDS) requested[c][s] = MAX_LEVEL;
    const result = optimizeTarget(emptyLevels(), requested);
    expect(result.plan).toEqual(requested);
    expect(result.steps).toHaveLength(1440);
    expect(result.error).toBeUndefined();
  });
  it("replays legal minimum-cost routes for 200 deterministic target distributions", () => {
    let seed = 104729;
    const random = (max: number) => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed % max;
    };
    for (let n = 0; n < 200; n++) {
      const initial = emptyLevels();
      for (let i = 0; i < 100; i++) {
        const c = CLASS_IDS[random(4)],
          s = STAT_IDS[random(4)];
        if (canUpgrade(initial, c, s).allowed) initial[c][s]++;
      }
      const targets = emptyLevels();
      for (const c of CLASS_IDS)
        for (const s of STAT_IDS) targets[c][s] = random(91);
      const original = structuredClone(initial),
        result = optimizeTarget(initial, targets),
        replay = structuredClone(initial);
      for (const step of result.steps) {
        expect(canUpgrade(replay, step.classId, step.statId).allowed).toBe(
          true,
        );
        expect(step.destination).toBe(replay[step.classId][step.statId] + 1);
        replay[step.classId][step.statId] = step.destination;
      }
      expect(result.error).toBeUndefined();
      expect(replay).toEqual(result.plan);
      expect(initial).toEqual(original);
      expect(result.cost).toBe(totalPlannedCost(initial, result.plan));
      // Independent lower bound: mandatory stats + cheapest extras to the required class total.
      const mandatory = structuredClone(initial);
      for (const c of CLASS_IDS)
        for (const s of STAT_IDS)
          mandatory[c][s] = Math.max(initial[c][s], targets[c][s]);
      const required =
        Math.floor(
          (Math.max(...CLASS_IDS.map((c) => classTotal(mandatory, c))) - 1) /
            10,
        ) * 10;
      let minimum = 0;
      for (const c of CLASS_IDS) {
        const extras: number[] = [];
        for (const s of STAT_IDS) {
          minimum += cumulativeStatCost(initial[c][s], mandatory[c][s]);
          for (let level = mandatory[c][s] + 1; level <= MAX_LEVEL; level++)
            extras.push(upgradeCost(level)!);
        }
        minimum += extras
          .sort((a, b) => a - b)
          .slice(0, Math.max(0, required - classTotal(mandatory, c)))
          .reduce((a, b) => a + b, 0);
      }
      expect(result.cost).toBe(minimum);
      expect(
        CLASS_IDS.every(
          (c) => classTotal(result.plan, c) <= unlockedCap(result.plan),
        ),
      ).toBe(true);
    }
  });
});
