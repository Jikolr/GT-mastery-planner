import { describe, expect, it } from "vitest";
import { CLASS_IDS, emptyLevels, isLegalDistribution } from "./game/mastery";
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
describe("saved data and transfers", () => {
  it("round-trips targets, resources and 10 named presets", () => {
    const data = newSnapshot();
    data.targets.warrior.atk = 51;
    data.presets = Array.from({ length: 10 }, (_, i) => ({
      id: String(i),
      name: `Raid ${i}`,
      levels: emptyLevels(),
    }));
    expect(parseBackup(serializeBackup(data))).toEqual(data);
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
    levels.warrior.atk = 90;
    expect(parseSetupHash(setupHash(levels))).toEqual(levels);
    expect(parseSetupHash("#other")).toBeNull();
    expect(() => parseSetupHash("#setup=1,2,3")).toThrow();
    expect(() =>
      parseSetupHash("#setup=" + Array(16).fill("91").join(",")),
    ).toThrow();
  });
});
