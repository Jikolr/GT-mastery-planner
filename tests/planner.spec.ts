import { expect, test } from "@playwright/test";
import { newSnapshot, serializeBackup, STORAGE_KEY } from "../app/state";
import { CLASS_IDS, emptyLevels } from "../app/game/mastery";

test("reductions cannot invalidate a mastery gate and lock notices keep card heights stable", async ({
  page,
}) => {
  await page.goto("/");
  const card = page.locator(".class-warrior.class-card");
  const before = (await card.boundingBox())!.height;
  for (const c of ["Warrior", "Ranged", "Tank", "Support"]) {
    const input = page.getByRole("spinbutton", {
      name: `Set ${c} ATK Increase level`,
      exact: true,
    });
    await input.fill("10");
    await input.press("Tab");
    if (c === "Warrior")
      expect((await card.boundingBox())!.height).toBeCloseTo(before, 0);
  }
  await page
    .getByRole("spinbutton", {
      name: "Set Warrior ATK Increase level",
      exact: true,
    })
    .fill("11");
  await page
    .getByRole("spinbutton", {
      name: "Set Warrior ATK Increase level",
      exact: true,
    })
    .press("Tab");
  await page
    .getByRole("spinbutton", {
      name: "Set Ranged ATK Increase level",
      exact: true,
    })
    .fill("9");
  await page
    .getByRole("spinbutton", {
      name: "Set Ranged ATK Increase level",
      exact: true,
    })
    .press("Tab");
  await expect(
    page.getByRole("spinbutton", {
      name: "Set Ranged ATK Increase level",
      exact: true,
    }),
  ).toHaveValue("10");
  await expect(page.getByText(/This reduction would remove/)).toBeVisible();
});

test("optimizer keeps targets, saves its result, and restores them after reload", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Target optimizer", exact: true })
    .click();
  const target = page.getByRole("spinbutton", {
    name: "Warrior ATK Increase target",
    exact: true,
  });
  await target.fill("51");
  await target.press("Tab");
  await page.getByRole("button", { name: "Planner", exact: true }).click();
  await page
    .getByRole("button", { name: "Target optimizer", exact: true })
    .click();
  await expect(target).toHaveValue("51");
  await page
    .getByRole("button", { name: "Save result (0/10)", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Preset name", exact: true })
    .fill("Raid");
  await page.getByRole("button", { name: "Save preset", exact: true }).click();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("gt-mastery-planner-v2")!),
  );
  expect(saved.presets[0].levels.warrior.atk).toBe(51);
  expect(saved.planned.warrior.atk).toBe(0);
  await page.reload();
  await page
    .getByRole("button", { name: "Target optimizer", exact: true })
    .click();
  await expect(target).toHaveValue("51");
  await page
    .getByRole("button", { name: "Reset targets", exact: true })
    .click();
  await expect(target).toHaveValue("0");
});

test("backup import previews changes and clearing requires confirmation", async ({
  page,
}) => {
  await page.goto("/");
  const backup = newSnapshot();
  for (const c of CLASS_IDS) backup.initial[c].atk = backup.planned[c].atk = 20;
  backup.targets.warrior.atk = 51;
  await page.locator("input[type=file]").setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(serializeBackup(backup)),
  });
  await expect(
    page.getByRole("dialog", { name: "Restore this backup?" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Restore backup", exact: true })
    .click();
  await expect(
    page.getByRole("spinbutton", {
      name: "Set Warrior ATK Increase level",
      exact: true,
    }),
  ).toHaveValue("20");
  await page
    .getByRole("button", { name: "Clear all saved data", exact: true })
    .click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(
    page.getByRole("spinbutton", {
      name: "Set Warrior ATK Increase level",
      exact: true,
    }),
  ).toHaveValue("20");
  await page
    .getByRole("button", { name: "Clear all saved data", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Clear everything", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Target optimizer", exact: true })
    .click();
  await expect(
    page.getByRole("spinbutton", {
      name: "Warrior ATK Increase target",
      exact: true,
    }),
  ).toHaveValue("0");
});

test("corrupt data stays recoverable and failed saves do not claim success", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("gt-mastery-planner-v2", "{corrupt");
  });
  await page.goto("/");
  await expect(page.getByText("Saving paused", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Download recovery data" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("gt-mastery-planner-v2")),
  ).toBe("{corrupt");
});
test("storage write errors are surfaced", async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    };
  });
  await page.goto("/");
  await expect(page.getByText("Not saved", { exact: true })).toBeVisible();
  await expect(page.getByRole("alert")).toContainText("Saving failed");
});

test("shared targets are previewed and do not replace the account", async ({
  page,
}) => {
  await page.goto("/#setup=51,0,0,49,0,0,0,0,0,0,0,0,0,0,0,0");
  await expect(
    page.getByRole("dialog", { name: "Shared setup", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Use as targets" }).click();
  await expect(
    page.getByRole("spinbutton", {
      name: "Warrior ATK Increase target",
      exact: true,
    }),
  ).toHaveValue("51");
  await expect(
    page.getByRole("spinbutton", {
      name: "Warrior Skill Damage Increase target",
      exact: true,
    }),
  ).toHaveValue("49");
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("gt-mastery-planner-v2")!).initial
          .warrior.atk,
    ),
  ).toBe(0);
});

test("mobile fits the viewport; artwork, Warrior color and text-only sharing metadata are present", async ({
  page,
  request,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    "content",
    "GT Mastery Planner",
  );
  await expect(
    page.locator('meta[property="og:image"], meta[name="twitter:image"]'),
  ).toHaveCount(0);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
    "content",
    "summary",
  );
  const visual = await page.evaluate(() => ({
    color: getComputedStyle(
      document.querySelector(".class-warrior .progress span")!,
    ).backgroundColor,
    background: getComputedStyle(document.body).backgroundImage,
    icons: Array.from(
      document.querySelectorAll<HTMLImageElement>(".class-icon img"),
    ).every((i) => i.complete && i.naturalWidth > 0),
  }));
  expect(visual.color).not.toBe("rgba(0, 0, 0, 0)");
  expect(visual.icons).toBe(true);
  const url = visual.background.match(/url\("?([^')"]+)/)![1];
  expect((await request.get(url)).status()).toBe(200);
  await page
    .getByRole("button", { name: "Target optimizer", exact: true })
    .click();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
});

test("web app reloads offline after caching", async ({ page, context }) => {
  await page.goto("/");
  await expect(page.getByText(/Ready for offline use/)).toBeVisible({
    timeout: 20000,
  });
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: /Mastery Planner/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Target optimizer", exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/Ready for offline use/)).toBeVisible();
});

test("Escape cancels a level edit and Enter does not submit the account editor", async ({
  page,
}) => {
  await page.goto("/");
  const input = page.getByRole("spinbutton", {
    name: "Set Warrior ATK Increase level",
    exact: true,
  });
  await input.fill("9");
  await input.press("Escape");
  await expect(input).toHaveValue("0");
  await page
    .getByRole("button", { name: "Edit current levels", exact: true })
    .click();
  const current = page.getByRole("spinbutton", {
    name: "Warrior ATK Increase current level",
    exact: true,
  });
  await current.fill("3");
  await current.press("Enter");
  await expect(
    page.getByRole("dialog", { name: "Edit current levels", exact: true }),
  ).toBeVisible();
  await expect(current).toHaveValue("3");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(input).toHaveValue("0");
});

test("ten-preset limit, renaming, comparison and confirmed deletion", async ({
  page,
}) => {
  const saved = newSnapshot();
  saved.presets = Array.from({ length: 10 }, (_, i) => ({
    id: String(i),
    name: `Setup ${i}`,
    levels: emptyLevels(),
  }));
  saved.presets[0].levels.warrior.atk = 11;
  await page.addInitScript(
    ({ key, data }) => localStorage.setItem(key, JSON.stringify(data)),
    { key: STORAGE_KEY, data: saved },
  );
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Save preset (10/10)", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Rename Setup 0", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Preset name", exact: true })
    .fill("Raid");
  await page.getByRole("button", { name: "Save preset", exact: true }).click();
  await page
    .getByRole("button", { name: "Target optimizer", exact: true })
    .click();
  await page.getByLabel("Compare with a saved preset").selectOption("0");
  await expect(page.locator(".comparison")).toContainText("3,636,000 GP");
  await expect(page.locator(".comparison .class-icon img")).toHaveCount(4);
  await page.getByRole("button", { name: "Delete Raid", exact: true }).click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Save result (10/10)", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Delete Raid", exact: true }).click();
  await page
    .getByRole("button", { name: "Delete preset", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Save result (9/10)", exact: true }),
  ).toBeEnabled();
});

test("all sliders rescale when the final class unlocks a gate", async ({
  page,
}) => {
  await page.goto("/");
  for (const name of ["Warrior", "Ranged", "Tank", "Support"]) {
    await page
      .getByRole("slider", {
        name: `${name} ATK Increase planned level`,
        exact: true,
      })
      .press("End");
  }
  for (const name of ["Warrior", "Ranged", "Tank", "Support"]) {
    const slider = page.getByRole("slider", {
      name: `${name} ATK Increase planned level`,
      exact: true,
    });
    await expect(slider).toHaveAttribute("max", "20");
    await expect(slider).toHaveValue("10");
  }
});
