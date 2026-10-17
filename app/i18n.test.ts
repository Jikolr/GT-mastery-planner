import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import ts from "typescript";
import {
  catalogs,
  korean,
  translate,
  localizedDuration,
  isLanguage,
} from "./i18n";
import { CLASS_NAMES, STAT_NAMES, editPlan, emptyLevels } from "./game/mastery";

describe("English / Korean localization", () => {
  it("covers every message and placeholder in all additional languages", () => {
    const tokens = (s: string) =>
      [...s.matchAll(/\{\w+\}/g)].map((m) => m[0]).sort();
    for (const [language, catalog] of Object.entries(catalogs)) {
      expect(Object.keys(catalog).sort(), language).toEqual(
        Object.keys(korean).sort(),
      );
      for (const [key, value] of Object.entries(catalog)) {
        expect(value.trim(), `${language}: ${key}`).not.toBe("");
        expect(tokens(value), `${language}: ${key}`).toEqual(tokens(key));
      }
    }
  });
  it("validates saved language codes and formats the new durations", () => {
    for (const code of ["en", "ko", "ja", "es", "zh-CN"])
      expect(isLanguage(code)).toBe(true);
    for (const code of [null, "fr", "toString", "__proto__"])
      expect(isLanguage(code)).toBe(false);
    expect(localizedDuration(25.5, "ja")).toBe("1日 1時間 30分");
    expect(localizedDuration(25.5, "es")).toBe("1 día 1 hora 30 minutos");
    expect(localizedDuration(48, "es")).toBe("2 días");
    expect(localizedDuration(25.5, "zh-CN")).toBe("1天 1小时 30分钟");
    expect(localizedDuration(0, "es")).toBe("0 minutos");
    expect(localizedDuration(0.001, "ja")).toBe("1分");
  });
  it("covers all static translation calls and retains every interpolation parameter", () => {
    for (const [english, ko] of Object.entries(korean)) {
      expect(ko.trim(), english).not.toBe("");
      const tokens = (s: string) =>
        [...s.matchAll(/\{\w+\}/g)].map((m) => m[0]).sort();
      expect(tokens(ko), english).toEqual(tokens(english));
    }
    for (const path of [
      "app/page.tsx",
      "app/pwa.tsx",
      "app/components/Modal.tsx",
      "app/components/ResetCalculator.tsx",
    ]) {
      const source = ts.createSourceFile(
        path,
        readFileSync(path, "utf8"),
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX,
      );
      function literalKeys(node: ts.Node) {
        if (ts.isStringLiteral(node))
          expect(
            Object.hasOwn(korean, node.text),
            `${path}: ${node.text}`,
          ).toBe(true);
        else if (ts.isConditionalExpression(node)) {
          literalKeys(node.whenTrue);
          literalKeys(node.whenFalse);
        }
      }
      function visit(node: ts.Node) {
        if (
          ts.isCallExpression(node) &&
          node.expression.getText(source) === "t" &&
          node.arguments[0]
        )
          literalKeys(node.arguments[0]);
        ts.forEachChild(node, visit);
      }
      visit(source);
    }
    for (const label of [
      ...Object.values(CLASS_NAMES),
      ...Object.values(STAT_NAMES),
    ])
      expect(translate("ko", label)).not.toBe(label);
  });
  it("keeps names untouched and translates messages again when language changes", () => {
    const message = {
      key: "“{name}” loaded for your current account. Added {count} prerequisite levels to keep it legal.",
      values: { name: "Warrior {name} 레이드", count: 30 },
    };
    expect(translate("en", message)).toBe(
      "“Warrior {name} 레이드” loaded for your current account. Added 30 prerequisite levels to keep it legal.",
    );
    expect(translate("ko", message)).toContain("Warrior {name} 레이드");
    expect(translate("ko", message)).toContain("30");
    expect(translate("ko", message)).not.toContain("loaded for");
  });
  it("formats days, hours and rounded-up minutes in both languages", () => {
    expect(localizedDuration(25.5, "ko")).toBe("1일 1시간 30분");
    expect(localizedDuration(25.5, "en")).toBe("1 day 1 hour 30 minutes");
    expect(localizedDuration(0, "ko")).toBe("0분");
    expect(localizedDuration(0.001, "ko")).toBe("1분");
  });
  it("translates domain errors at the display boundary without changing the plan", () => {
    const levels = emptyLevels();
    const result = editPlan(levels, levels, "warrior", "atk", 51);
    expect(translate("ko", result.message)).toContain("10레벨");
    expect(translate("en", result.message)).toContain("Mastery gate reached");
    expect(levels.warrior.atk).toBe(0);
    expect(
      translate("ko", {
        key: "Import failed: {error}",
        values: { error: "Invalid JSON backup file." },
      }),
    ).toBe("가져오기 실패: 백업 파일의 JSON 형식이 올바르지 않습니다.");
  });
});
