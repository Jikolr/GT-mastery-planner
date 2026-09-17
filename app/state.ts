import {
  CLASS_IDS,
  STAT_IDS,
  emptyLevels,
  isLegalDistribution,
  isLevels,
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

export function parsePresets(value: unknown): Preset[] {
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
      !isLevels(p.levels)
    ) {
      throw new Error("One or more presets are invalid.");
    }
    ids.add(p.id);
    return { id: p.id, name: p.name.trim(), levels: structuredClone(p.levels) };
  });
}

/** Strict shape validation; plans from old versions are adapted, never account levels. */
export function parseSnapshot(value: unknown): Snapshot {
  if (
    !record(value) ||
    value.version !== 2 ||
    !resource(value.guardianPoints) ||
    !resource(value.income) ||
    !isLegalDistribution(value.initial) ||
    !isLevels(value.planned) ||
    !isLevels(value.targets)
  ) {
    throw new Error(
      "This is not a valid planner backup. Check its version, resources and current mastery levels.",
    );
  }
  const initial = structuredClone(value.initial);
  const planned = optimizeTarget(initial, value.planned);
  if (planned.error) throw new Error(planned.error);
  return {
    version: 2,
    guardianPoints: value.guardianPoints,
    income: value.income,
    initial,
    planned: planned.plan,
    targets: structuredClone(value.targets),
    presets: parsePresets(value.presets),
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
    if (raw !== null)
      return { data: parseSnapshot(JSON.parse(raw)), blocked: false };
    old = storage.getItem(LEGACY_KEY);
    oldPresets = storage.getItem(LEGACY_PRESETS_KEY);
    if (old === null && oldPresets === null)
      return { data: newSnapshot(), blocked: false };
    const legacy = old ? JSON.parse(old) : newSnapshot();
    if (!record(legacy)) throw new Error("Invalid legacy data.");
    const data = parseSnapshot({
      ...legacy,
      version: 2,
      targets: legacy.planned ?? emptyLevels(),
      presets: JSON.parse(oldPresets ?? "[]"),
    });
    return {
      data,
      blocked: false,
      warning:
        "Previous saves imported. Any missing mastery prerequisites were added to your plan; your real account levels were preserved.",
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
    values.some((v) => !/^\d{1,2}$/.test(v) || Number(v) > 90)
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
