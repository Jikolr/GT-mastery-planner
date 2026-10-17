import { expect, test, type Page } from "@playwright/test";
import {
  CLASS_IDS,
  CLASS_NAMES,
  STAT_IDS,
  STAT_NAMES,
  emptyLevels,
  type Levels,
} from "../app/game/mastery";
import { LANGUAGE_KEY, languages, translate, type Language } from "../app/i18n";
import { newSnapshot, STORAGE_KEY, type Snapshot } from "../app/state";

async function seedAccount(
  page: Page,
  data: Snapshot,
  language: Language = "en",
) {
  await page.addInitScript(
    ({ key, data, languageKey, language }) => {
      if (!localStorage.getItem(key))
        localStorage.setItem(key, JSON.stringify(data));
      localStorage.setItem(languageKey, language);
    },
    { key: STORAGE_KEY, data, languageKey: LANGUAGE_KEY, language },
  );
}

async function setCurrentLevels(page: Page, levels: Levels) {
  await page
    .getByRole("button", { name: "Edit current levels", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Edit current levels",
    exact: true,
  });
  for (const c of CLASS_IDS) {
    for (const s of STAT_IDS) {
      const input = dialog.getByRole("spinbutton", {
        name: `${CLASS_NAMES[c]} ${STAT_NAMES[s]} current level`,
        exact: true,
      });
      await input.fill(String(levels[c][s]));
      await input.press("Tab");
    }
  }
  await dialog
    .getByRole("button", { name: "Save & reset plan", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
}

test("reset total uses all current fields and the balance, independently of plans and targets, after reload", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  const current = emptyLevels();
  for (const c of CLASS_IDS)
    STAT_IDS.forEach((s, index) => (current[c][s] = index + 1));
  await setCurrentLevels(page, current);
  await page
    .getByLabel("Current Guardian Points", { exact: true })
    .fill("640000");

  const reset = page.locator(".reset-summary output");
  // Each class has 80,000 + 164,000 + 252,000 + 344,000 invested.
  await expect(reset).toHaveText("4,000,000 GP");
  await expect(page.locator(".reset-summary small")).toHaveText(
    "Includes 3,360,000 GP invested in your current levels.",
  );
  await page.locator(".summary-card").screenshot({
    path: testInfo.outputPath("reset-summary.png"),
  });
  await page
    .getByRole("button", { name: "Increase Warrior ATK Increase", exact: true })
    .click();
  await expect(reset).toHaveText("4,000,000 GP");
  await page
    .getByRole("button", { name: "Target optimizer", exact: true })
    .click();
  const target = page.getByRole("spinbutton", {
    name: "Warrior ATK Increase target",
    exact: true,
  });
  await target.fill("11");
  await target.press("Tab");
  await expect(reset).toHaveText("4,000,000 GP");

  await page.reload();
  await expect(reset).toHaveText("4,000,000 GP");
  await expect(
    page.getByLabel("Current Guardian Points", { exact: true }),
  ).toHaveValue("640000");
  await expect(
    page.getByRole("spinbutton", {
      name: "Set Warrior ATK Increase level",
      exact: true,
    }),
  ).toHaveValue("2");
  await page
    .getByRole("button", { name: "Target optimizer", exact: true })
    .click();
  await expect(target).toHaveValue("11");
  await page
    .getByLabel("Current Guardian Points", { exact: true })
    .fill("1640000");
  await expect(reset).toHaveText("5,000,000 GP");
});

test("the displayed refund can fund a manually simulated reset and target build", async ({
  page,
}) => {
  const saved = newSnapshot();
  saved.guardianPoints = 320000;
  for (const c of CLASS_IDS)
    for (const s of STAT_IDS) saved.initial[c][s] = saved.planned[c][s] = 1;
  await seedAccount(page, saved);
  await page.goto("/");
  const reset = page.locator(".reset-summary output");
  await expect(reset).toHaveText("1,600,000 GP");
  const total = Number((await reset.innerText()).replace(/\D/g, ""));
  await page.locator(".reset-help summary").click();
  await expect(page.locator(".reset-help")).toContainText(
    "Note this total, set all current levels to 0, enter the total as Current Guardian Points, then enter your targets in Target optimizer.",
  );

  await setCurrentLevels(page, emptyLevels());
  await expect(reset).toHaveText("320,000 GP");
  await page
    .getByLabel("Current Guardian Points", { exact: true })
    .fill(String(total));
  await page
    .getByRole("button", { name: "Target optimizer", exact: true })
    .click();
  for (const c of CLASS_IDS) {
    const target = page.getByRole("spinbutton", {
      name: `${CLASS_NAMES[c]} ATK Increase target`,
      exact: true,
    });
    await target.fill("4");
    await target.press("Tab");
  }
  await expect(
    page
      .locator(".summary-grid .metric")
      .filter({ hasText: "Target route cost" }),
  ).toContainText("1,376,000 GP");
  await expect(
    page
      .locator(".summary-grid .metric")
      .filter({ hasText: "Remaining Guardian Points" }),
  ).toContainText("224,000 GP");
  await expect(page.locator(".deficit-strip")).toHaveCount(0);
  await expect(reset).toHaveText("1,600,000 GP");
});

test("level inputs and sliders stop at 64 and the final purchase costs 11,500,000 GP", async ({
  page,
}) => {
  const saved = newSnapshot();
  saved.guardianPoints = 50000000;
  for (const c of CLASS_IDS)
    saved.initial[c].atk = saved.planned[c].atk = saved.targets[c].atk = 63;
  await seedAccount(page, saved);
  await page.goto("/");

  const planned = page.getByRole("spinbutton", {
    name: "Set Warrior ATK Increase level",
    exact: true,
  });
  const slider = page.getByRole("slider", {
    name: "Warrior ATK Increase planned level",
    exact: true,
  });
  const increase = page.getByRole("button", {
    name: "Increase Warrior ATK Increase",
    exact: true,
  });
  const row = page.locator(".class-warrior .stat-row").filter({ has: planned });
  await expect(planned).toHaveAttribute("max", "64");
  await expect(slider).toHaveAttribute("max", "64");
  await expect(row).toContainText("Next: 11,500,000 GP");
  await slider.press("End");
  await expect(planned).toHaveValue("64");
  await expect(increase).toBeDisabled();
  await expect(row).toContainText("Maximum level reached");
  await expect(
    page
      .locator(".summary-grid .metric")
      .filter({ hasText: "Planned upgrade cost" }),
  ).toContainText("11,500,000 GP");
  await planned.fill("65");
  await planned.press("Tab");
  await expect(planned).toHaveValue("64");

  await page
    .getByRole("button", { name: "Edit current levels", exact: true })
    .click();
  const current = page.getByRole("spinbutton", {
    name: "Warrior ATK Increase current level",
    exact: true,
  });
  await expect(current).toHaveAttribute("max", "64");
  await current.fill("65");
  await current.press("Tab");
  await expect(current).toHaveValue("64");
  await page
    .getByRole("button", { name: "Save & reset plan", exact: true })
    .click();
  await expect(planned).toHaveValue("64");
  await expect(increase).toBeDisabled();

  await page
    .getByRole("button", { name: "Target optimizer", exact: true })
    .click();
  const target = page.getByRole("spinbutton", {
    name: "Warrior ATK Increase target",
    exact: true,
  });
  await expect(target).toHaveAttribute("max", "64");
  await target.fill("65");
  await target.press("Tab");
  await expect(target).toHaveValue("64");
});

for (const language of Object.keys(languages) as Language[]) {
  test(`${language}: reset labels and large totals fit mobile in both views`, async ({
    page,
  }) => {
    const saved = newSnapshot();
    saved.guardianPoints = 123456789;
    for (const c of CLASS_IDS)
      for (const s of STAT_IDS) saved.initial[c][s] = saved.planned[c][s] = 64;
    await seedAccount(page, saved, language);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const t = (key: string) => translate(language, key);
    const money = (points: number) =>
      `${new Intl.NumberFormat(languages[language].locale).format(points)} GP`;

    for (const view of ["Planner", "Target optimizer"]) {
      await page.getByRole("button", { name: t(view), exact: true }).click();
      const summary = page.locator(".reset-summary");
      await expect(summary.locator("#reset-points-label")).toHaveText(
        t("Guardian Points after reset"),
      );
      await expect(summary.locator("output")).toHaveText(money(2144256789));
      await expect(summary.locator("small")).toHaveText(
        translate(
          language,
          "Includes {points} invested in your current levels.",
          {
            points: money(2020800000),
          },
        ),
      );
      await expect(summary.locator("summary")).toHaveText(
        t("How to plan a reset"),
      );
      if ((await summary.locator("details").getAttribute("open")) === null)
        await summary.locator("summary").click();
      for (const text of [
        "This is your current balance plus the points spent across all 16 current levels.",
        "Note this total, set all current levels to 0, enter the total as Current Guardian Points, then enter your targets in Target optimizer.",
      ]) {
        await expect(summary.getByText(t(text), { exact: true })).toBeVisible();
      }
      for (const width of [390, 320]) {
        await page.setViewportSize({ width, height: 844 });
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth),
        ).toBeLessThanOrEqual(width);
      }
    }
  });
}
