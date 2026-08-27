export const CLASS_IDS = ['warrior', 'ranged', 'tank', 'support'] as const;
export const STAT_IDS = ['atk', 'hp', 'def', 'skillDamage'] as const;
export type ClassId = (typeof CLASS_IDS)[number];
export type StatId = (typeof STAT_IDS)[number];
export type Levels = Record<ClassId, Record<StatId, number>>;

export const CLASS_NAMES: Record<ClassId, string> = { warrior: 'Warrior', ranged: 'Ranged', tank: 'Tank', support: 'Support' };
export const STAT_NAMES: Record<StatId, string> = { atk: 'ATK Increase', hp: 'HP Increase', def: 'DEF Increase', skillDamage: 'Skill Damage Increase' };

export const COSTS: readonly number[] = [
  80000,84000,88000,92000,96000,100000,104000,108000,112000,116000,
  160000,168000,176000,184000,192000,200000,208000,216000,224000,232000,
  320000,336000,352000,368000,384000,400000,416000,432000,448000,464000,
  640000,672000,704000,736000,768000,800000,832000,864000,896000,928000,
  1600000,1680000,1760000,1840000,1920000,2000000,2080000,2160000,2240000,2320000,
  4000000,4200000,4400000,4600000,4800000,5000000,5200000,5400000,5600000,5800000,
  10000000,10500000,11000000,11500000,12000000,12500000,13000000,13500000,14000000,
];

export function emptyLevels(): Levels {
  return Object.fromEntries(CLASS_IDS.map((id) => [id, Object.fromEntries(STAT_IDS.map((s) => [s, 0]))])) as Levels;
}

export function sanitizeLevel(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(69, Math.floor(parsed))) : 0;
}

export function classTotal(levels: Levels, classId: ClassId): number {
  return STAT_IDS.reduce((sum, statId) => sum + levels[classId][statId], 0);
}

export function classTotals(levels: Levels): Record<ClassId, number> {
  return Object.fromEntries(CLASS_IDS.map((id) => [id, classTotal(levels, id)])) as Record<ClassId, number>;
}

export function unlockedCap(levels: Levels): number {
  return (Math.floor(Math.min(...Object.values(classTotals(levels))) / 10) + 1) * 10;
}

export function isMilestone(destinationLevel: number): boolean {
  return destinationLevel > 1 && (destinationLevel - 1) % 10 === 0;
}

export function bonusTenths(statId: StatId, level: number): number {
  if (level <= 0) return 0;
  const scale = statId === 'skillDamage' ? 2 : 1;
  return (level + Math.floor((level - 1) / 10) * 10) * scale;
}

export function bonusPercent(statId: StatId, level: number): number {
  return bonusTenths(statId, level) / 10;
}

export function upgradeCost(destinationLevel: number): number | null {
  return destinationLevel >= 1 && destinationLevel <= COSTS.length ? COSTS[destinationLevel - 1] : null;
}

export type UpgradeCheck = { allowed: true; cost: number } | { allowed: false; reason: 'cost-unavailable' | 'mastery-locked'; cap?: number; blockers?: ClassId[] };

export function canUpgrade(levels: Levels, classId: ClassId, statId: StatId): UpgradeCheck {
  const destination = levels[classId][statId] + 1;
  const cost = upgradeCost(destination);
  if (cost === null) return { allowed: false, reason: 'cost-unavailable' };
  const cap = unlockedCap(levels);
  if (classTotal(levels, classId) + 1 > cap) {
    const totals = classTotals(levels);
    return { allowed: false, reason: 'mastery-locked', cap, blockers: CLASS_IDS.filter((id) => totals[id] < cap) };
  }
  return { allowed: true, cost };
}

export function cumulativeStatCost(initial: number, planned: number): number {
  let total = 0;
  for (let destination = initial + 1; destination <= planned; destination++) total += upgradeCost(destination) ?? 0;
  return total;
}

export function totalPlannedCost(initial: Levels, planned: Levels): number {
  return CLASS_IDS.reduce((total, classId) => total + STAT_IDS.reduce((sum, statId) => sum + cumulativeStatCost(initial[classId][statId], planned[classId][statId]), 0), 0);
}

export function remainingPoints(starting: number, plannedCost: number): number { return starting - plannedCost; }
export function deficitFor(remaining: number): number { return Math.max(0, -remaining); }

export function hoursUntilAffordable(deficit: number, incomePerHour: number): number | null {
  if (deficit <= 0) return 0;
  return incomePerHour > 0 ? deficit / incomePerHour : null;
}

export function targetDate(now: Date, deficit: number, incomePerHour: number): Date | null {
  const hours = hoursUntilAffordable(deficit, incomePerHour);
  return hours === null ? null : new Date(now.getTime() + hours * 3600000);
}

export function formatDuration(hours: number): string {
  const totalMinutes = Math.ceil(hours * 60);
  const days = Math.floor(totalMinutes / 1440);
  const remainder = totalMinutes % 1440;
  const hrs = Math.floor(remainder / 60);
  const mins = remainder % 60;
  return [days && `${days} ${days === 1 ? 'day' : 'days'}`, hrs && `${hrs} ${hrs === 1 ? 'hour' : 'hours'}`, (mins || (!days && !hrs)) && `${mins} ${mins === 1 ? 'minute' : 'minutes'}`].filter(Boolean).join(' ');
}
