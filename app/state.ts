import {
  CLASS_IDS,
  MAX_LEVEL,
  STAT_IDS,
  emptyLevels,
  isLegalDistribution,
  optimizeTarget,
  type Levels,
} from "./game/mastery";

export const STORAGE_KEY = "gt-mastery-planner-v2";
export const LEGACY_KEY = "gt-mastery-planner-v1";
export const LEGACY_PRESETS_KEY = "gt-mastery-presets-v1";
export const PRESET_LIMIT = 10;
export type Preset = { id: string; name: string; levels: Levels };
export type Snapshot = {
  version: 2;
  guardianPoints: number;
  income: number;
  initial: Levels;
  planned: Levels;
  targets: Levels;
  presets: Preset[];
};
export const newSnapshot = (): Snapshot => ({
  version: 2,
  guardianPoints: 12500000,
  income: 11808,
  initial: emptyLevels(),
  planned: emptyLevels(),
  targets: emptyLevels(),
  presets: [],
});
const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const resource = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0;

// Earlier releases allowed theoretical levels through 90. Validate that old
// range before reducing plans, targets or presets to the current game limit.
const PREVIOUS_MAX_LEVEL = 90;
const isSavedLevels = (value: unknown): value is Levels =>
  record(value) &&
  CLASS_IDS.every((c) => {
    const stats = value[c];
    return (
      record(stats) &&
      STAT_IDS.every((s) => {
        const level = stats[s];
        return (
          typeof level === "number" &&
          Number.isInteger(level) &&
          level >= 0 &&
          level <= Math.max(MAX_LEVEL, PREVIOUS_MAX_LEVEL)
        );
      })
    );
  });
const capSavedLevels = (levels: Levels): Levels => {
  const result = structuredClone(levels);
  for (const c of CLASS_IDS)
    for (const s of STAT_IDS) result[c][s] = Math.min(MAX_LEVEL, levels[c][s]);
  return result;
};
const exceedsCurrentLimit = (levels: Levels): boolean =>
  CLASS_IDS.some((c) => STAT_IDS.some((s) => levels[c][s] > MAX_LEVEL));
const LEVEL_LIMIT_WARNING =
  `Saved plans, targets and presets above level ${MAX_LEVEL} were reduced to the current limit. ` +
  "Mastery prerequisites were added where needed; your current account levels and resources were preserved.";

export function parsePresets(value: unknown): Preset[] {
  return parseSavedPresets(value).map((p) => ({
    ...p,
    levels: capSavedLevels(p.levels),
  }));
}

function parseSavedPresets(value: unknown): Preset[] {
  if (!Array.isArray(value) || value.length > PRESET_LIMIT)
    throw new Error("A backup can contain at most 10 presets.");
  const ids = new Set<string>();
  return value.map((p) => {
    if (
      !record(p) ||
      typeof p.id !== "string" ||
      !p.id ||
      ids.has(p.id) ||
      typeof p.name !== "string" ||
      !p.name.trim() ||
      p.name.trim().length > 40 ||
      !isSavedLevels(p.levels)
    ) {
      throw new Error("One or more presets are invalid.");
    }
    ids.add(p.id);
    return { id: p.id, name: p.name.trim(), levels: structuredClone(p.levels) };
  });
}

/** Strict shape validation; plans from old versions are adapted, never account levels. */
export function parseSnapshot(value: unknown): Snapshot {
  return parseSnapshotResult(value).data;
}

function parseSnapshotResult(value: unknown): {
  data: Snapshot;
  capped: boolean;
} {
  if (
    !record(value) ||
    value.version !== 2 ||
    !resource(value.guardianPoints) ||
    !resource(value.income) ||
    !isLegalDistribution(value.initial) ||
    !isSavedLevels(value.planned) ||
    !isSavedLevels(value.targets)
  ) {
    throw new Error(
      "This is not a valid planner backup. Check its version, resources and current mastery levels.",
    );
  }
  const presets = parseSavedPresets(value.presets);
  const capped = [
    value.planned,
    value.targets,
    ...presets.map((p) => p.levels),
  ].some(exceedsCurrentLimit);
  const initial = structuredClone(value.initial);
  const planned = optimizeTarget(initial, capSavedLevels(value.planned));
  if (planned.error) throw new Error(planned.error);
  return {
    data: {
      version: 2,
      guardianPoints: value.guardianPoints,
      income: value.income,
      initial,
      planned: planned.plan,
      targets: capSavedLevels(value.targets),
      presets: presets.map((p) => ({ ...p, levels: capSavedLevels(p.levels) })),
    },
    capped,
  };
}

export type Loaded = {
  data: Snapshot;
  warning?: string;
  recovery?: string;
  blocked: boolean;
};
export function loadSnapshot(storage: Pick<Storage, "getItem">): Loaded {
  let raw: string | null = null;
  let old: string | null = null;
  let oldPresets: string | null = null;
  try {
    raw = storage.getItem(STORAGE_KEY);
    if (raw !== null) {
      const parsed = parseSnapshotResult(JSON.parse(raw));
      return {
        data: parsed.data,
        blocked: false,
        warning: parsed.capped ? LEVEL_LIMIT_WARNING : undefined,
      };
    }
    old = storage.getItem(LEGACY_KEY);
    oldPresets = storage.getItem(LEGACY_PRESETS_KEY);
    if (old === null && oldPresets === null)
      return { data: newSnapshot(), blocked: false };
    const legacy = old ? JSON.parse(old) : newSnapshot();
    if (!record(legacy)) throw new Error("Invalid legacy data.");
    const parsed = parseSnapshotResult({
      ...legacy,
      version: 2,
      targets: legacy.planned ?? emptyLevels(),
      presets: JSON.parse(oldPresets ?? "[]"),
    });
    return {
      data: parsed.data,
      blocked: false,
      warning: parsed.capped
        ? LEVEL_LIMIT_WARNING
        : "Previous saves imported. Any missing mastery prerequisites were added to your plan; your real account levels were preserved.",
    };
  } catch {
    return {
      data: newSnapshot(),
      blocked: true,
      recovery: JSON.stringify(
        { current: raw, legacy: old, presets: oldPresets },
        null,
        2,
      ),
      warning:
        "Saved data could not be read. Automatic saving is paused to preserve it. Download recovery data, then import a backup or choose Clear all saved data to start again.",
    };
  }
}

export function serializeBackup(data: Snapshot): string {
  return JSON.stringify(
    {
      format: "guardian-tales-mastery-planner",
      exportedAt: new Date().toISOString(),
      data,
    },
    null,
    2,
  );
}
export function parseBackup(text: string): Snapshot {
  if (text.length > 100000)
    throw new Error("Backup is too large (maximum 100 KB).");
  const value: unknown = JSON.parse(text);
  if (!record(value) || value.format !== "guardian-tales-mastery-planner")
    throw new Error("Choose a Guardian Tales planner backup JSON file.");
  return parseSnapshot(value.data);
}

export function setupHash(levels: Levels): string {
  return (
    "#setup=" +
    CLASS_IDS.flatMap((c) => STAT_IDS.map((s) => levels[c][s])).join(",")
  );
}
/** Share only 16 target levels: never include resources or private preset names. */
export function parseSetupHash(hash: string): Levels | null {
  if (!hash.startsWith("#setup=")) return null;
  const values = hash.slice(7).split(",");
  if (
    values.length !== 16 ||
    values.some((v) => !/^\d{1,2}$/.test(v) || Number(v) > MAX_LEVEL)
  )
    throw new Error("This setup link contains invalid levels.");
  const levels = emptyLevels();
  CLASS_IDS.forEach((c, i) =>
    STAT_IDS.forEach((s, j) => {
      levels[c][s] = Number(values[i * 4 + j]);
    }),
  );
  return levels;
}
