import { describe, expect, it } from "vitest";
import {
  CLASS_IDS,
  MAX_LEVEL,
  STAT_IDS,
  emptyLevels,
  isLegalDistribution,
} from "./game/mastery";
import {
  LEGACY_KEY,
  LEGACY_PRESETS_KEY,
  STORAGE_KEY,
  loadSnapshot,
  newSnapshot,
  parseBackup,
  parsePresets,
  parseSetupHash,
  parseSnapshot,
  serializeBackup,
  setupHash,
} from "./state";
const storage = (values: Record<string, string>) => ({
  getItem: (key: string) => values[key] ?? null,
});
const oldTheoreticalSnapshot = () => {
  const data = newSnapshot();
  data.guardianPoints = 12345678;
  data.income = 8765;
  for (const c of CLASS_IDS) data.initial[c].atk = 10;
  data.planned = structuredClone(data.initial);
  data.planned.warrior.atk = 90;
  data.targets.ranged.def = 70;
  const preset = { id: "raid", name: "Raid build", levels: emptyLevels() };
  preset.levels.support.hp = 65;
  data.presets = [preset];
  return data;
};
describe("saved data and transfers", () => {
  it("round-trips targets, resources and 10 named presets", () => {
    const data = newSnapshot();
    data.targets.warrior.atk = 51;
    data.reset.levels.warrior.atk = 64;
    data.reset.levels.support.hp = 23;
    data.reset.guardianPoints = 31415926;
    data.presets = Array.from({ length: 10 }, (_, i) => ({
      id: String(i),
      name: `Raid ${i}`,
      levels: emptyLevels(),
    }));
    expect(parseBackup(serializeBackup(data))).toEqual(data);
    expect(
      loadSnapshot(storage({ [STORAGE_KEY]: JSON.stringify(data) })).data,
    ).toEqual(data);
  });
  it("creates independent empty reset inputs", () => {
    const data = newSnapshot();
    expect(data.reset).toEqual({
      levels: emptyLevels(),
      guardianPoints: 12500000,
    });
    data.reset.levels.warrior.atk = 64;
    data.reset.guardianPoints = 7;
    expect(data.initial).toEqual(emptyLevels());
    expect(data.planned).toEqual(emptyLevels());
    expect(data.targets).toEqual(emptyLevels());
    expect(data.guardianPoints).toBe(12500000);
    expect(newSnapshot().reset).toEqual({
      levels: emptyLevels(),
      guardianPoints: 12500000,
    });
  });
  it.each(["v1", "v2"])(
    "initializes missing reset inputs independently from %s account data",
    (version) => {
      const data = newSnapshot();
      data.guardianPoints = 7654321;
      for (const c of CLASS_IDS) data.initial[c].atk = 10;
      data.planned = structuredClone(data.initial);
      const legacy: Partial<typeof data> = { ...data };
      delete legacy.reset;
      const raw = JSON.stringify(legacy);
      const loaded = loadSnapshot(
        storage({ [version === "v1" ? LEGACY_KEY : STORAGE_KEY]: raw }),
      );
      expect(loaded.blocked).toBe(false);
      expect(loaded.data.reset).toEqual({
        levels: data.initial,
        guardianPoints: data.guardianPoints,
      });
      const imported = parseBackup(
        JSON.stringify({
          format: "guardian-tales-mastery-planner",
          data: legacy,
        }),
      );
      expect(imported.reset).toEqual(loaded.data.reset);
      for (const migrated of [loaded.data, imported]) {
        migrated.reset.levels.warrior.atk = 64;
        migrated.reset.guardianPoints = 0;
        expect(migrated.initial).toEqual(data.initial);
        expect(migrated.guardianPoints).toBe(data.guardianPoints);
        expect(legacy.initial).toEqual(data.initial);
      }
    },
  );
  it("accepts reset inputs independently of mastery gates and clones them", () => {
    const data = newSnapshot();
    data.reset.levels.warrior.atk = 64;
    expect(isLegalDistribution(data.reset.levels)).toBe(false);
    const parsed = parseSnapshot(data);
    expect(parsed.reset).toEqual(data.reset);
    parsed.reset.levels.warrior.atk = 0;
    expect(data.reset.levels.warrior.atk).toBe(64);
  });
  it.each([65, 90, 91, -1, 0.5, "64", null, NaN, Infinity])(
    "rejects invalid reset level %s and preserves stored recovery data",
    (invalid) => {
      const data = newSnapshot();
      (data.reset.levels.warrior as Record<string, unknown>).atk = invalid;
      expect(() => parseSnapshot(data)).toThrow();
      expect(() => parseBackup(serializeBackup(data))).toThrow();
      const raw = JSON.stringify(data);
      const loaded = loadSnapshot(storage({ [STORAGE_KEY]: raw }));
      expect(loaded.blocked).toBe(true);
      expect(JSON.parse(loaded.recovery!).current).toBe(raw);
    },
  );
  it.each([-1, 1.5, Number.MAX_SAFE_INTEGER + 1, "100", null, NaN, Infinity])(
    "rejects invalid reset points %s",
    (guardianPoints) => {
      expect(() =>
        parseSnapshot({
          ...newSnapshot(),
          reset: { levels: emptyLevels(), guardianPoints },
        }),
      ).toThrow();
    },
  );
  it.each([
    null,
    [],
    {},
    { levels: emptyLevels() },
    { guardianPoints: 0 },
    { guardianPoints: 0, levels: {} },
    { guardianPoints: 0, levels: null },
    { guardianPoints: 0, levels: [] },
  ])("rejects malformed reset inputs %#", (reset) => {
    expect(() => parseSnapshot({ ...newSnapshot(), reset })).toThrow();
  });
  it("rejects invalid, duplicate, or oversized presets", () => {
    expect(() => parsePresets(Array(11).fill({}))).toThrow();
    const p = { id: "same", name: "Raid", levels: emptyLevels() };
    expect(() => parsePresets([p, p])).toThrow();
    expect(() => parsePresets([{ ...p, levels: {} }])).toThrow();
  });
  it("migrates v1 without discarding presets and repairs illegal plans", () => {
    const old = newSnapshot();
    for (const c of CLASS_IDS) old.planned[c].atk = 10;
    old.planned.warrior.atk = 11;
    old.planned.ranged.atk = 9;
    const loaded = loadSnapshot(
      storage({
        [LEGACY_KEY]: JSON.stringify(old),
        [LEGACY_PRESETS_KEY]: JSON.stringify([
          { id: "a", name: "Raid", levels: emptyLevels() },
        ]),
      }),
    );
    expect(loaded.blocked).toBe(false);
    expect(loaded.data.presets).toHaveLength(1);
    expect(isLegalDistribution(loaded.data.planned)).toBe(true);
    expect(loaded.data.initial).toEqual(old.initial);
  });
  it("imports older v2 backups by capping only theoretical levels", () => {
    const old = oldTheoreticalSnapshot();
    const untouched = structuredClone(old);
    const data = parseBackup(serializeBackup(old));
    expect(parseSnapshot(old)).toEqual(data);
    expect(data.guardianPoints).toBe(old.guardianPoints);
    expect(data.income).toBe(old.income);
    expect(data.initial).toEqual(old.initial);
    expect(data.planned.warrior.atk).toBe(MAX_LEVEL);
    expect(isLegalDistribution(data.planned)).toBe(true);
    for (const c of CLASS_IDS)
      for (const s of STAT_IDS) {
        expect(data.planned[c][s]).toBeGreaterThanOrEqual(old.initial[c][s]);
        expect(data.planned[c][s]).toBeLessThanOrEqual(MAX_LEVEL);
      }
    expect(data.targets).toEqual({
      ...old.targets,
      ranged: { ...old.targets.ranged, def: MAX_LEVEL },
    });
    expect(data.presets).toEqual([
      {
        ...old.presets[0],
        levels: {
          ...old.presets[0].levels,
          support: { ...old.presets[0].levels.support, hp: MAX_LEVEL },
        },
      },
    ]);
    expect(old).toEqual(untouched);
  });
  it.each(["v1", "v2"])(
    "loads %s saves with theoretical levels through 90 and warns about the cap",
    (version) => {
      const old = oldTheoreticalSnapshot();
      const values: Record<string, string> =
        version === "v1"
          ? {
              [LEGACY_KEY]: JSON.stringify({ ...old, version: 1 }),
              [LEGACY_PRESETS_KEY]: JSON.stringify(old.presets),
            }
          : { [STORAGE_KEY]: JSON.stringify(old) };
      const loaded = loadSnapshot(storage(values));
      expect(loaded.blocked).toBe(false);
      expect(loaded.recovery).toBeUndefined();
      expect(loaded.warning).toContain("above level 64 were reduced");
      expect(loaded.data.initial).toEqual(old.initial);
      expect(loaded.data.guardianPoints).toBe(old.guardianPoints);
      expect(loaded.data.income).toBe(old.income);
      expect(loaded.data.presets[0].name).toBe("Raid build");
      expect(loaded.data.presets[0].id).toBe("raid");
      expect(loaded.data.presets[0].levels.support.hp).toBe(MAX_LEVEL);
      expect(loaded.data.planned.warrior.atk).toBe(MAX_LEVEL);
      expect(isLegalDistribution(loaded.data.planned)).toBe(true);
      expect(loaded.data.targets).toEqual(
        version === "v1"
          ? {
              ...old.planned,
              warrior: { ...old.planned.warrior, atk: MAX_LEVEL },
            }
          : {
              ...old.targets,
              ranged: { ...old.targets.ranged, def: MAX_LEVEL },
            },
      );
    },
  );
  it.each(["planned", "targets", "presets"] as const)(
    "warns when only %s needed capping",
    (field) => {
      const data = newSnapshot();
      if (field === "presets") {
        data.presets = [{ id: "a", name: "Raid", levels: emptyLevels() }];
        data.presets[0].levels.warrior.atk = 65;
      } else data[field].warrior.atk = 65;
      const loaded = loadSnapshot(
        storage({ [STORAGE_KEY]: JSON.stringify(data) }),
      );
      expect(loaded.blocked).toBe(false);
      expect(loaded.warning).toContain("above level 64 were reduced");
    },
  );
  it("retains valid level 64 account data without a migration warning", () => {
    const data = newSnapshot();
    for (const c of CLASS_IDS) data.initial[c].atk = 64;
    data.planned = structuredClone(data.initial);
    data.targets = structuredClone(data.initial);
    const loaded = loadSnapshot(
      storage({ [STORAGE_KEY]: JSON.stringify(data) }),
    );
    expect(loaded).toEqual({ data, blocked: false, warning: undefined });
  });
  it.each(["v1", "v2"])(
    "preserves unsupported current account levels in %s recovery data",
    (version) => {
      const data = oldTheoreticalSnapshot();
      for (const c of CLASS_IDS) data.initial[c].atk = 65;
      expect(() => parseBackup(serializeBackup(data))).toThrow();
      const raw = JSON.stringify(data);
      const loaded = loadSnapshot(
        storage({ [version === "v1" ? LEGACY_KEY : STORAGE_KEY]: raw }),
      );
      expect(loaded.blocked).toBe(true);
      const recovery = JSON.parse(loaded.recovery!);
      expect(recovery[version === "v1" ? "legacy" : "current"]).toBe(raw);
    },
  );
  it.each([91, -1, 64.5, "65", null, NaN, Infinity])(
    "rejects invalid theoretical level %s before migration",
    (invalid) => {
      for (const field of ["planned", "targets", "presets"] as const) {
        const data = oldTheoreticalSnapshot();
        const levels =
          field === "presets" ? data.presets[0].levels : data[field];
        (levels.warrior as Record<string, unknown>).atk = invalid;
        expect(() => parseSnapshot(data)).toThrow();
        expect(() => parseBackup(serializeBackup(data))).toThrow();
        const raw = JSON.stringify(data);
        const loaded = loadSnapshot(storage({ [STORAGE_KEY]: raw }));
        expect(loaded.blocked).toBe(true);
        expect(JSON.parse(loaded.recovery!).current).toBe(raw);
      }
    },
  );
  it.each(["planned", "targets", "presets"] as const)(
    "rejects missing levels in saved %s before migration",
    (field) => {
      const data = oldTheoreticalSnapshot();
      const levels = field === "presets" ? data.presets[0].levels : data[field];
      delete (levels.warrior as Partial<typeof levels.warrior>).hp;
      expect(() => parseSnapshot(data)).toThrow();
    },
  );
  it.each([
    "{bad",
    "null",
    "{}",
    JSON.stringify({ ...newSnapshot(), initial: {} }),
  ])("preserves malformed saved data for recovery", (raw) => {
    const loaded = loadSnapshot(storage({ [STORAGE_KEY]: raw }));
    expect(loaded.blocked).toBe(true);
    expect(JSON.parse(loaded.recovery!).current).toBe(raw);
  });
  it("blocks writes when storage is inaccessible", () => {
    expect(
      loadSnapshot({
        getItem: () => {
          throw new Error("denied");
        },
      }).blocked,
    ).toBe(true);
  });
  it("rejects non-finite resources and unsupported schemas", () => {
    expect(() =>
      parseSnapshot({ ...newSnapshot(), income: Infinity }),
    ).toThrow();
    expect(() => parseSnapshot({ ...newSnapshot(), version: 99 })).toThrow();
    expect(() => parseBackup("x".repeat(100001))).toThrow();
  });
  it("shares exactly 16 target levels, with no resources or names", () => {
    const levels = emptyLevels();
    levels.warrior.atk = 64;
    expect(parseSetupHash(setupHash(levels))).toEqual(levels);
    expect(parseSetupHash("#other")).toBeNull();
    expect(() => parseSetupHash("#setup=1,2,3")).toThrow();
    expect(() =>
      parseSetupHash("#setup=" + Array(16).fill("65").join(",")),
    ).toThrow();
  });
});
