export const CLASS_IDS = ["warrior", "ranged", "tank", "support"] as const;
export const STAT_IDS = ["atk", "hp", "def", "skillDamage"] as const;
export type ClassId = (typeof CLASS_IDS)[number];
export type StatId = (typeof STAT_IDS)[number];
export type Levels = Record<ClassId, Record<StatId, number>>;

export const CLASS_NAMES: Record<ClassId, string> = {
  warrior: "Warrior",
  ranged: "Ranged",
  tank: "Tank",
  support: "Support",
};
export const STAT_NAMES: Record<StatId, string> = {
  atk: "ATK Increase",
  hp: "HP Increase",
  def: "DEF Increase",
  skillDamage: "Skill Damage Increase",
};

export const MAX_LEVEL = 90;
export const SPECULATIVE_FROM_LEVEL = 71;

// Levels 1–70 follow the observed curve. Levels 71–90 deliberately extend the
// same ×2.5-per-decade rule and are marked as estimates throughout the UI.
export const COSTS: readonly number[] = Array.from(
  { length: MAX_LEVEL },
  (_, index) => {
    const currentLevel = index;
    const blockBase =
      currentLevel < 40
        ? 80000 * 2 ** Math.floor(currentLevel / 10)
        : 1600000 * 2.5 ** Math.floor((currentLevel - 40) / 10);
    return Math.round(blockBase * (1 + 0.05 * (currentLevel % 10)));
  },
);

export function emptyLevels(): Levels {
  return Object.fromEntries(
    CLASS_IDS.map((id) => [
      id,
      Object.fromEntries(STAT_IDS.map((s) => [s, 0])),
    ]),
  ) as Levels;
}

export function sanitizeLevel(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed)
    ? Math.max(0, Math.min(MAX_LEVEL, Math.floor(parsed)))
    : 0;
}

export function classTotal(levels: Levels, classId: ClassId): number {
  return STAT_IDS.reduce((sum, statId) => sum + levels[classId][statId], 0);
}

export function classTotals(levels: Levels): Record<ClassId, number> {
  return Object.fromEntries(
    CLASS_IDS.map((id) => [id, classTotal(levels, id)]),
  ) as Record<ClassId, number>;
}

export function unlockedCap(levels: Levels): number {
  return (
    (Math.floor(Math.min(...Object.values(classTotals(levels))) / 10) + 1) * 10
  );
}

export function isMilestone(destinationLevel: number): boolean {
  return destinationLevel > 1 && (destinationLevel - 1) % 10 === 0;
}

export function bonusTenths(statId: StatId, level: number): number {
  if (level <= 0) return 0;
  const scale = statId === "skillDamage" ? 2 : 1;
  return (level + Math.floor((level - 1) / 10) * 10) * scale;
}

export function bonusPercent(statId: StatId, level: number): number {
  return bonusTenths(statId, level) / 10;
}

export function upgradeCost(destinationLevel: number): number | null {
  return Number.isInteger(destinationLevel) &&
    destinationLevel >= 1 &&
    destinationLevel <= COSTS.length
    ? COSTS[destinationLevel - 1]
    : null;
}

export function isSpeculativeCost(destinationLevel: number): boolean {
  return destinationLevel >= SPECULATIVE_FROM_LEVEL;
}

export type UpgradeCheck =
  | { allowed: true; cost: number }
  | {
      allowed: false;
      reason: "cost-unavailable" | "mastery-locked";
      cap?: number;
      blockers?: ClassId[];
    };

export function canUpgrade(
  levels: Levels,
  classId: ClassId,
  statId: StatId,
): UpgradeCheck {
  const destination = levels[classId][statId] + 1;
  const cost = upgradeCost(destination);
  if (cost === null) return { allowed: false, reason: "cost-unavailable" };
  const cap = unlockedCap(levels);
  if (classTotal(levels, classId) + 1 > cap) {
    const totals = classTotals(levels);
    return {
      allowed: false,
      reason: "mastery-locked",
      cap,
      blockers: CLASS_IDS.filter((id) => totals[id] < cap),
    };
  }
  return { allowed: true, cost };
}

export function cumulativeStatCost(initial: number, planned: number): number {
  let total = 0;
  for (let destination = initial + 1; destination <= planned; destination++)
    total += upgradeCost(destination) ?? 0;
  return total;
}

export function totalPlannedCost(initial: Levels, planned: Levels): number {
  return CLASS_IDS.reduce(
    (total, classId) =>
      total +
      STAT_IDS.reduce(
        (sum, statId) =>
          sum +
          cumulativeStatCost(
            initial[classId][statId],
            planned[classId][statId],
          ),
        0,
      ),
    0,
  );
}

export function remainingPoints(starting: number, plannedCost: number): number {
  return starting - plannedCost;
}
export function deficitFor(remaining: number): number {
  return Math.max(0, -remaining);
}

export function hoursUntilAffordable(
  deficit: number,
  incomePerHour: number,
): number | null {
  if (deficit <= 0) return 0;
  return incomePerHour > 0 ? deficit / incomePerHour : null;
}

export function targetDate(
  now: Date,
  deficit: number,
  incomePerHour: number,
): Date | null {
  const hours = hoursUntilAffordable(deficit, incomePerHour);
  if (hours === null) return null;
  const date = new Date(now.getTime() + hours * 3600000);
  return Number.isFinite(date.getTime()) ? date : null;
}

export function formatDuration(hours: number): string {
  const totalMinutes = Math.ceil(hours * 60);
  const days = Math.floor(totalMinutes / 1440);
  const remainder = totalMinutes % 1440;
  const hrs = Math.floor(remainder / 60);
  const mins = remainder % 60;
  return [
    days && `${days} ${days === 1 ? "day" : "days"}`,
    hrs && `${hrs} ${hrs === 1 ? "hour" : "hours"}`,
    (mins || (!days && !hrs)) && `${mins} ${mins === 1 ? "minute" : "minutes"}`,
  ]
    .filter(Boolean)
    .join(" ");
}

export type OptimizationStep = {
  classId: ClassId;
  statId: StatId;
  destination: number;
  cost: number;
  reason: "target" | "unlock";
};
export type OptimizationResult = {
  plan: Levels;
  steps: OptimizationStep[];
  cost: number;
  error?: string;
};

export function optimizeTarget(
  initial: Levels,
  requested: Levels,
): OptimizationResult {
  if (!isLegalDistribution(initial)) {
    return {
      plan: structuredClone(initial),
      steps: [],
      cost: 0,
      error: "Current levels do not respect the shared mastery gates.",
    };
  }
  // Work on a clone: optimization is a preview and must never mutate saved account data.
  const plan = structuredClone(initial) as Levels;
  const target = structuredClone(initial) as Levels;
  for (const c of CLASS_IDS)
    for (const s of STAT_IDS)
      target[c][s] = Math.max(initial[c][s], sanitizeLevel(requested[c][s]));
  const steps: OptimizationStep[] = [];
  for (const c of CLASS_IDS)
    for (const s of STAT_IDS)
      if (target[c][s] > MAX_LEVEL)
        return {
          plan,
          steps,
          cost: 0,
          error: `Targets must be between level 0 and ${MAX_LEVEL}.`,
        };
  let guard = 0;
  while (
    guard++ < 2000 &&
    CLASS_IDS.some((c) => STAT_IDS.some((s) => plan[c][s] < target[c][s]))
  ) {
    let chosen: { c: ClassId; s: StatId; reason: "target" | "unlock" } | null =
      null;
    targetSearch: for (const c of CLASS_IDS)
      for (const s of STAT_IDS)
        if (plan[c][s] < target[c][s] && canUpgrade(plan, c, s).allowed) {
          chosen = { c, s, reason: "target" };
          break targetSearch;
        }
    if (!chosen) {
      // No requested upgrade is currently legal. Buy the cheapest filler in a
      // lagging class so the shared mastery cap can advance.
      const cap = unlockedCap(plan);
      const blocker = CLASS_IDS.find((c) => classTotal(plan, c) < cap);
      if (!blocker) break;
      const s = STAT_IDS.filter((x) => plan[blocker][x] < MAX_LEVEL).sort(
        (a, b) =>
          (upgradeCost(plan[blocker][a] + 1) ?? Infinity) -
          (upgradeCost(plan[blocker][b] + 1) ?? Infinity),
      )[0];
      if (!s) break;
      chosen = { c: blocker, s, reason: "unlock" };
    }
    const cost = upgradeCost(plan[chosen.c][chosen.s] + 1);
    if (cost === null)
      return {
        plan,
        steps,
        cost: steps.reduce((n, x) => n + x.cost, 0),
        error: "A target exceeds the available cost table.",
      };
    plan[chosen.c][chosen.s]++;
    steps.push({
      classId: chosen.c,
      statId: chosen.s,
      destination: plan[chosen.c][chosen.s],
      cost,
      reason: chosen.reason,
    });
  }
  return {
    plan,
    steps,
    cost: steps.reduce((n, x) => n + x.cost, 0),
    error: CLASS_IDS.some((c) =>
      STAT_IDS.some((s) => plan[c][s] < target[c][s]),
    )
      ? "The requested target could not be reached."
      : undefined,
  };
}

/** Validate persisted/input shapes before any arithmetic. Targets may be unbalanced. */
export function isLevels(value: unknown): value is Levels {
  if (!value || typeof value !== "object") return false;
  return CLASS_IDS.every((c) => {
    const stats = (value as Record<string, unknown>)[c];
    return (
      stats !== null &&
      typeof stats === "object" &&
      STAT_IDS.every((s) => {
        const level = (stats as Record<string, unknown>)[s];
        return (
          typeof level === "number" &&
          Number.isInteger(level) &&
          level >= 0 &&
          level <= MAX_LEVEL
        );
      })
    );
  });
}

export function isLegalDistribution(value: unknown): value is Levels {
  return (
    isLevels(value) &&
    Object.values(classTotals(value)).every(
      (total) => total <= unlockedCap(value),
    )
  );
}

/** The same edit policy applies to buttons, sliders and typed levels. */
export function editPlan(
  initial: Levels,
  planned: Levels,
  c: ClassId,
  s: StatId,
  requested: number,
): { plan: Levels; message?: string } {
  const next = structuredClone(planned);
  const target = Math.max(initial[c][s], sanitizeLevel(requested));
  if (target < next[c][s]) {
    next[c][s] = target;
    if (!isLegalDistribution(next)) {
      return {
        plan: planned,
        message:
          "This reduction would remove a mastery prerequisite. Lower the higher classes first, or reset the plan.",
      };
    }
  } else {
    while (next[c][s] < target && canUpgrade(next, c, s).allowed) next[c][s]++;
  }
  return {
    plan: next,
    message:
      next[c][s] < target
        ? `Mastery gate reached at level ${next[c][s]}. Raise the other classes before continuing.`
        : undefined,
  };
}

export type RouteStage = {
  cap: number;
  resultingCap: number;
  cost: number;
  cumulativeCost: number;
  targetCount: number;
  unlockCount: number;
  steps: OptimizationStep[];
};

/** A gate-opening purchase belongs to the stage it finishes. ETA uses cumulative cost. */
export function routeStages(
  initial: Levels,
  steps: OptimizationStep[],
): RouteStage[] {
  const replay = structuredClone(initial);
  const stages: RouteStage[] = [];
  let cumulativeCost = 0;
  for (const step of steps) {
    const cap = unlockedCap(replay);
    if (stages.at(-1)?.cap !== cap)
      stages.push({
        cap,
        resultingCap: cap,
        cost: 0,
        cumulativeCost,
        targetCount: 0,
        unlockCount: 0,
        steps: [],
      });
    const stage = stages[stages.length - 1];
    replay[step.classId][step.statId] = step.destination;
    stage.steps.push(step);
    stage.cost += step.cost;
    cumulativeCost += step.cost;
    stage.cumulativeCost = cumulativeCost;
    stage[step.reason === "target" ? "targetCount" : "unlockCount"]++;
    stage.resultingCap = unlockedCap(replay);
  }
  return stages;
}
