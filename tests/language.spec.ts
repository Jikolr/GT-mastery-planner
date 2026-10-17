import { expect, test } from "@playwright/test";
import { newSnapshot, STORAGE_KEY, serializeBackup } from "../app/state";
import { LANGUAGE_KEY } from "../app/i18n";
import { translate, type Language } from "../app/i18n";

for (const language of ["ja", "es", "zh-CN"] as Language[]) {
  test(`${language}: localized dialogs, optimizer, mobile layout and persistence`, async ({
    page,
  }) => {
    const t = (key: string) => translate(language, key);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page
      .getByRole("combobox", { name: "Language", exact: true })
      .selectOption(language);
    await expect(page.locator("html")).toHaveAttribute("lang", language);
    await expect(page).toHaveTitle(t("Guardian Tales Mastery Planner"));
    await page
      .getByRole("button", { name: `${t("Save preset")} (0/10)`, exact: true })
      .click();
    await page
      .getByRole("textbox", { name: t("Preset name"), exact: true })
      .fill("My Raid 日本 中文");
    await page
      .getByRole("button", { name: t("Save preset"), exact: true })
      .click();
    await expect(
      page.getByText("My Raid 日本 中文", { exact: true }),
    ).toBeVisible();
    await page.locator("input[type=file]").setInputFiles({
      name: "bad.json",
      mimeType: "application/json",
      buffer: Buffer.from("{bad"),
    });
    await expect(
      page.getByText(
        translate(language, {
          key: "Import failed: {error}",
          values: { error: "Invalid JSON backup file." },
        }),
        { exact: true },
      ),
    ).toBeVisible();
    await page
      .getByRole("button", { name: t("Target optimizer"), exact: true })
      .click();
    const fieldName = translate(language, "{class} {stat} target", {
      class: t("Warrior"),
      stat: t("ATK Increase"),
    });
    await page
      .getByRole("spinbutton", { name: fieldName, exact: true })
      .fill("51");
    await page
      .getByRole("spinbutton", { name: fieldName, exact: true })
      .press("Tab");
    await expect(
      page.getByRole("heading", {
        name: t("Recommended distribution"),
        exact: true,
      }),
    ).toBeVisible();
    for (const width of [390, 600, 1280]) {
      await page.setViewportSize({ width, height: 844 });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
    }
    const before = await page.evaluate(
      (key) => localStorage.getItem(key),
      STORAGE_KEY,
    );
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", language);
    await page
      .getByRole("combobox", { name: t("Language"), exact: true })
      .selectOption("en");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    expect(
      await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY),
    ).toBe(before);
    await expect(
      page.getByText("My Raid 日本 中文", { exact: true }),
    ).toBeVisible();
  });
}

test("switches both ways, preserves the whole account, and remembers Korean on reload", async ({
  page,
}) => {
  const data = newSnapshot();
  data.planned.warrior.atk = 3;
  data.targets.warrior.atk = 51;
  data.presets = [
    {
      id: "raid",
      name: "Warrior 레이드",
      levels: structuredClone(data.planned),
    },
  ];
  await page.addInitScript(
    ({ key, data }) => {
      if (!localStorage.getItem(key))
        localStorage.setItem(key, JSON.stringify(data));
    },
    { key: STORAGE_KEY, data },
  );
  await page.goto("/");
  await page
    .getByRole("combobox", { name: "Language", exact: true })
    .selectOption("ko");
  await expect(page.locator("html")).toHaveAttribute("lang", "ko");
  await expect(page).toHaveTitle("가디언 테일즈 숙련도 플래너");
  await expect(
    page.getByRole("button", { name: "목표 최적화", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("spinbutton", {
      name: "전사 공격력 증가 레벨 설정",
      exact: true,
    }),
  ).toHaveValue("3");
  await expect(page.getByText("Warrior 레이드", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "목표 최적화", exact: true }).click();
  await expect(
    page.getByRole("spinbutton", {
      name: "전사 공격력 증가 목표 레벨",
      exact: true,
    }),
  ).toHaveValue("51");
  await expect(page.getByRole("heading", { name: "추천 분배" })).toBeVisible();
  await expect(page.locator(".optimizer-result")).toContainText("일");
  await expect(
    page.getByRole("heading", {
      name: translate("ko", "Your upgrade route"),
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(page.locator(".route-stage")).toHaveCount(0);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "ko");
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!),
      STORAGE_KEY,
    ),
  ).toEqual(data);
  await page
    .getByRole("combobox", { name: "언어", exact: true })
    .selectOption("en");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(
    page.getByRole("button", { name: "Target optimizer", exact: true }),
  ).toBeVisible();
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    "content",
    "GT Mastery Planner",
  );
});

test("Korean dialogs and errors work at mobile widths without translating user content", async ({
  page,
}) => {
  await page.addInitScript(
    (key) => localStorage.setItem(key, "ko"),
    LANGUAGE_KEY,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page
    .getByRole("button", { name: "현재 레벨 수정", exact: true })
    .click();
  const field = page.getByRole("spinbutton", {
    name: "전사 공격력 증가 현재 레벨",
    exact: true,
  });
  await field.fill("51");
  await field.press("Tab");
  await page
    .getByRole("button", { name: "저장 및 계획 초기화", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("숙련도 해제 조건");
  await page.getByRole("button", { name: "취소", exact: true }).click();
  await page
    .getByRole("button", { name: "프리셋 저장 (0/10)", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "프리셋 이름", exact: true })
    .fill("My Raid 레이드");
  await page.getByRole("button", { name: "프리셋 저장", exact: true }).click();
  await page
    .getByRole("button", { name: "My Raid 레이드 삭제", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "현재 계획은 유지됩니다",
  );
  await page.getByRole("button", { name: "취소", exact: true }).click();
  await page.locator("input[type=file]").setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from("{bad"),
  });
  await expect(
    page.getByText(
      "가져오기 실패: 백업 파일의 JSON 형식이 올바르지 않습니다.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.locator("input[type=file]").setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(serializeBackup(newSnapshot())),
  });
  await expect(
    page.getByRole("dialog", { name: "이 백업을 복원할까요?" }),
  ).toContainText("누락된 숙련도 선행 조건");
  await page.getByRole("button", { name: "취소", exact: true }).click();
  await page
    .getByRole("button", { name: "저장 데이터 모두 삭제", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("프리셋 1개");
  await page.getByRole("button", { name: "취소", exact: true }).click();
  await page.getByRole("button", { name: "목표 최적화", exact: true }).click();
  for (const width of [390, 600]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
  }
});

test("language switching still works when preference storage fails", async ({
  page,
}) => {
  await page.addInitScript((key) => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name, value) {
      if (name === key) throw new DOMException("Unavailable");
      original.call(this, name, value);
    };
  }, LANGUAGE_KEY);
  await page.goto("/");
  await page
    .getByRole("combobox", { name: "Language", exact: true })
    .selectOption("ko");
  await expect(page.locator("html")).toHaveAttribute("lang", "ko");
  await expect(
    page.getByText("이 기기에 언어 설정을 저장할 수 없습니다."),
  ).toBeVisible();
  await expect(page.getByText("이 기기에 저장됨", { exact: true })).toHaveCount(
    0,
  );
  const level = page.getByRole("spinbutton", {
    name: "전사 공격력 증가 레벨 설정",
    exact: true,
  });
  await level.fill("3");
  await level.press("Tab");
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!).planned.warrior.atk,
      STORAGE_KEY,
    ),
  ).toBe(3);
});
