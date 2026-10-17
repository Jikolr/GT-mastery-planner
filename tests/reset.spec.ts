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

async function setResetLevels(page: Page, levels: Levels) {
  for (const c of CLASS_IDS) {
    for (const s of STAT_IDS) {
      const input = page.getByRole("spinbutton", {
        name: `${CLASS_NAMES[c]} ${STAT_NAMES[s]} reset level`,
        exact: true,
      });
      await input.fill(String(levels[c][s]));
      await input.press("Tab");
    }
  }
}

test("a shared distribution shows the exact cumulative refund and balance by class", async ({
  page,
}, testInfo) => {
  await page.goto("/#setup=17,3,0,0,0,20,0,0,10,0,0,0,10,0,0,0");
  await page
    .getByRole("dialog", { name: "Shared setup", exact: true })
    .getByRole("button", { name: "Calculate reset", exact: true })
    .click();
  await page
    .getByLabel("Unspent Guardian Points", { exact: true })
    .fill("2000000");
  const calculator = page.locator(".reset-calculator");
  await expect(calculator.locator(".reset-account-note")).toHaveCount(0);
  await expect(
    calculator.getByText(
      "This calculator does not change your saved account, plan or optimizer targets.",
      { exact: true },
    ),
  ).toHaveCount(0);
  await expect(calculator.locator(".reset-invested")).toContainText(
    "7,420,000 GP",
  );
  await expect(calculator.locator(".reset-total output")).toHaveText(
    "9,420,000 GP",
  );
  for (const [name, invested] of [
    ["Warrior", "2,520,000 GP"],
    ["Ranged", "2,940,000 GP"],
    ["Tank", "980,000 GP"],
    ["Support", "980,000 GP"],
  ]) {
    await expect(
      calculator.getByRole("group", { name, exact: true }),
    ).toContainText(invested);
  }
  await calculator.screenshot({
    path: testInfo.outputPath("reset-calculator-desktop.png"),
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await calculator.screenshot({
    path: testInfo.outputPath("reset-calculator-mobile.png"),
  });
  const saved = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    STORAGE_KEY,
  );
  expect(saved.initial).toEqual(emptyLevels());
  expect(saved.planned).toEqual(emptyLevels());
  expect(saved.targets).toEqual(emptyLevels());
});

test("reset card buttons and sliders update totals freely across gates and stop at 0 and 64", async ({
  page,
}) => {
  const saved = newSnapshot();
  saved.reset.guardianPoints = 1000;
  await seedAccount(page, saved);
  await page.goto("/");
  await page
    .getByRole("button", { name: "Reset calculator", exact: true })
    .click();
  const calculator = page.locator(".reset-calculator");
  const card = calculator.getByRole("group", { name: "Warrior", exact: true });
  const input = card.getByRole("spinbutton", {
    name: "Warrior ATK Increase reset level",
    exact: true,
  });
  const slider = card.getByRole("slider", {
    name: "Warrior ATK Increase reset level",
    exact: true,
  });
  const increase = card.getByRole("button", {
    name: "Increase Warrior ATK Increase",
    exact: true,
  });
  const decrease = card.getByRole("button", {
    name: "Undo Warrior ATK Increase",
    exact: true,
  });
  const total = calculator.locator(".reset-total output");
  await expect(decrease).toBeDisabled();
  await expect(slider).toHaveAttribute("min", "0");
  await expect(slider).toHaveAttribute("max", "64");
  await expect(total).toHaveText("1,000 GP");
  await input.fill("10");
  await input.press("Tab");
  await expect(total).toHaveText("981,000 GP");
  await increase.click();
  await expect(input).toHaveValue("11");
  await expect(slider).toHaveValue("11");
  await expect(total).toHaveText("1,141,000 GP");
  for (const name of ["Ranged", "Tank", "Support"])
    await expect(
      calculator.getByRole("spinbutton", {
        name: `${name} ATK Increase reset level`,
        exact: true,
      }),
    ).toHaveValue("0");
  await slider.press("End");
  await expect(input).toHaveValue("64");
  await expect(increase).toBeDisabled();
  await expect(total).toHaveText("126,301,000 GP");
  await slider.press("ArrowLeft");
  await expect(input).toHaveValue("63");
  await expect(increase).toBeEnabled();
  await expect(total).toHaveText("114,801,000 GP");
  await decrease.click();
  await expect(input).toHaveValue("62");
  await expect(slider).toHaveValue("62");
  await expect(total).toHaveText("103,801,000 GP");
  await slider.press("Home");
  await expect(input).toHaveValue("0");
  await expect(decrease).toBeDisabled();
  await expect(total).toHaveText("1,000 GP");
});

test("all 16 reset inputs accept independent distributions and persist without changing the account or targets", async ({
  page,
}) => {
  const saved = newSnapshot();
  saved.guardianPoints = 123456;
  for (const c of CLASS_IDS) {
    saved.initial[c].atk = 10;
    saved.planned[c].atk = 11;
    saved.targets[c].atk = 20;
  }
  await seedAccount(page, saved);
  await page.goto("/");
  await page
    .getByRole("button", { name: "Reset calculator", exact: true })
    .click();
  const levels = emptyLevels();
  let level = 1;
  for (const c of CLASS_IDS) for (const s of STAT_IDS) levels[c][s] = level++;
  // Deliberately unbalanced: reset arithmetic must not require mastery prerequisites.
  await setResetLevels(page, levels);
  await page
    .getByLabel("Unspent Guardian Points", { exact: true })
    .fill("420000");
  await expect(page.locator(".reset-invested")).toContainText("14,580,000 GP");
  await expect(page.locator(".reset-total output")).toHaveText("15,000,000 GP");

  await page.getByRole("button", { name: "Planner", exact: true }).click();
  await expect(page.locator(".reset-calculator")).toHaveCount(0);
  await expect(
    page.getByLabel("Current Guardian Points", { exact: true }),
  ).toHaveValue("123456");
  await expect(
    page.getByRole("spinbutton", {
      name: "Set Warrior ATK Increase level",
      exact: true,
    }),
  ).toHaveValue("11");
  await page
    .getByRole("button", { name: "Target optimizer", exact: true })
    .click();
  await expect(
    page.getByRole("spinbutton", {
      name: "Warrior ATK Increase target",
      exact: true,
    }),
  ).toHaveValue("20");
  await page.reload();
  await page
    .getByRole("button", { name: "Reset calculator", exact: true })
    .click();
  await expect(page.locator(".reset-total output")).toHaveText("15,000,000 GP");
  const after = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    STORAGE_KEY,
  );
  expect(after).toEqual({
    ...saved,
    reset: { levels, guardianPoints: 420000 },
  });
});

test("copying the saved account or planner distribution uses their levels and unspent account balance", async ({
  page,
}) => {
  const saved = newSnapshot();
  saved.guardianPoints = 2000000;
  for (const c of CLASS_IDS) {
    saved.initial[c].atk = 10;
    saved.planned[c].atk = 11;
  }
  await seedAccount(page, saved);
  await page.goto("/");
  await page
    .getByRole("button", { name: "Reset calculator", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Use saved account", exact: true })
    .click();
  await expect(page.locator(".reset-invested")).toContainText("3,920,000 GP");
  await expect(page.locator(".reset-total output")).toHaveText("5,920,000 GP");
  await page
    .getByRole("button", { name: "Use planner distribution", exact: true })
    .click();
  await expect(
    page.getByLabel("Unspent Guardian Points", { exact: true }),
  ).toHaveValue("2000000");
  await expect(page.locator(".reset-invested")).toContainText("4,560,000 GP");
  await expect(page.locator(".reset-total output")).toHaveText("6,560,000 GP");
  const after = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    STORAGE_KEY,
  );
  expect(after).toEqual({
    ...saved,
    reset: { levels: saved.planned, guardianPoints: 2000000 },
  });
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
  await page
    .getByRole("button", { name: "Reset calculator", exact: true })
    .click();
  const reset = page.getByRole("spinbutton", {
    name: "Warrior ATK Increase reset level",
    exact: true,
  });
  await expect(reset).toHaveAttribute("max", "64");
  await reset.fill("65");
  await reset.press("Tab");
  await expect(reset).toHaveValue("64");
  await expect(page.locator(".reset-invested")).toContainText("126,300,000 GP");
});

for (const language of Object.keys(languages) as Language[]) {
  test(`${language}: reset calculator labels, inputs and large totals fit mobile`, async ({
    page,
  }) => {
    const saved = newSnapshot();
    saved.reset.guardianPoints = 123456789;
    for (const c of CLASS_IDS)
      for (const s of STAT_IDS) saved.reset.levels[c][s] = 64;
    await seedAccount(page, saved, language);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const t = (key: string) => translate(language, key);
    const money = (points: number) =>
      `${new Intl.NumberFormat(languages[language].locale).format(points)} GP`;

    await page
      .getByRole("button", { name: t("Reset calculator"), exact: true })
      .click();
    const calculator = page.locator(".reset-calculator");
    await expect(
      calculator.getByText(t("Guardian Points after reset"), { exact: true }),
    ).toBeVisible();
    await expect(calculator.locator(".reset-total output")).toHaveText(
      money(2144256789),
    );
    await expect(calculator.locator(".reset-invested")).toContainText(
      money(2020800000),
    );
    await expect(
      page.getByLabel(t("Unspent Guardian Points"), { exact: true }),
    ).toHaveValue("123456789");
    for (const name of ["Use saved account", "Use planner distribution"])
      await expect(
        calculator.getByRole("button", { name: t(name), exact: true }),
      ).toBeVisible();
    await expect(
      calculator.getByRole("spinbutton", {
        name: translate(language, "{class} {stat} reset level", {
          class: t("Warrior"),
          stat: t("ATK Increase"),
        }),
        exact: true,
      }),
    ).toHaveValue("64");
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
    }
  });
}
