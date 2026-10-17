# Guardian Tales Mastery Planner

A web and desktop application for planning Guardian Tales mastery upgrades without spending points in game.

## Use the planner online

### [Open Guardian Tales Mastery Planner in your browser](https://jikolr.github.io/GT-mastery-planner/)

The web version requires no download or account. Plans and presets are saved on your device, not sent to a server. After the app finishes caching during an online visit, you can reopen the planner without a connection. Your browser's **Install app / Add to Home Screen** option can add it to your applications. Installation support depends on the browser; the regular website remains available.

When **Update application** appears, click it to load the cached new version. The header and footer show the version, and the footer includes the source revision so you can identify exactly which build you are using.

> This is an unofficial fan-made tool. It is not affiliated with or endorsed by Kakao Games or Kong Studios.

## Features

- Switch the entire interface between **English, 한국어, 日本語, Español and 简体中文 (Simplified Chinese)** with the language selector in the header. The choice is saved on this device separately from account data. Preset names and shared setups are never translated or modified.
- Plan all four mastery classes: Warrior, Ranged, Tank, and Support.
- Adjust each stat from level 0 to the current maximum of 64 with buttons, sliders, or direct level entry.
- Calculate Guardian Point cost, remaining balance, deficit, and ETA.
- Use the independent **Reset calculator** to total the Guardian Points available after a reset, with spending broken down by class.
- Respect the shared mastery-cap rules while planning.
- Find a minimum-cost legal distribution for a target setup, including the necessary mastery prerequisites, total cost and ETA.
- Save, name, rename, compare, reload, and delete up to 10 distribution presets.
- Export/import complete JSON backups and share target levels through a link.
- Preserve optimizer targets when switching views; save the recommendation directly as a preset.
- Use the responsive web app offline after its first successful cache, or the desktop application offline immediately.

## Desktop application

### Download a release

Open [Releases](https://github.com/Jikolr/GT-mastery-planner/releases). Download an application asset, **not** GitHub's automatically generated **Source code** archive.

- **Windows 10/11 x64 (0.4.0 onward):** download `Guardian-Tales-Mastery-Planner-VERSION-win-x64.exe` and double-click it. This is a self-contained portable launcher; it extracts its runtime automatically, so there is no separate `resources` folder to move. It is not an installer and does not add an uninstall entry. Keep it in a folder of your choice and optionally create a shortcut.
- **macOS:** download the `.dmg` matching your processor (`arm64` for Apple Silicon, `x64` for Intel), open it and drag the app into Applications. A `.zip` containing the application is also provided. macOS builds must pass their native GitHub Actions jobs before release.
- **Older Windows ZIP releases:** extract the **complete** archive, then run `Guardian Tales Mastery Planner.exe`. Keep all extracted support files together. The new standalone `.exe` replaces that distribution format.

The applications have no verified publisher signature and are not notarized. macOS packages use a local ad-hoc signature for executable integrity, not an Apple Developer identity. Windows or macOS may block them or display an unknown-publisher warning. Only approve a download you trust from this repository; do not disable system-wide protection. You can instead use the web version or build the source. `SHA256SUMS.txt` lets you check download integrity (it is not a publisher signature).

Desktop saves are kept separately from the program under the existing `guardian-tales-mastery-planner` user-data profile. Replacing the executable does not intentionally delete them. **Export a backup before updating**. To remove the application, delete its executable/application bundle; use **Clear all saved data** first if you also want to erase planner data.

### Build it yourself from source

Anyone can audit the source and create the Windows build locally:

```powershell
git clone https://github.com/Jikolr/GT-mastery-planner.git
cd GT-mastery-planner
npm ci
npm run desktop:build
npm run desktop:smoke
```

Run these commands on Windows with Node.js 24 LTS and npm installed. For a particular release, check out its matching tag first (for example `git checkout v0.4.0`, once that tag is published). On macOS use `npm run desktop:mac` instead. Building the macOS package requires a Mac or the native GitHub runner, not Windows.

The distributable Windows `.exe` is generated in `release/`; `release/win-unpacked` is a support/testing directory, not a second download users need. The JavaScript in a release is bundled and minified from this repository. The smoke test starts the packaged app with an **isolated temporary profile**, checks rendering and artwork, then exits without opening or altering your real saves.

Exact byte-for-byte reproducibility is not currently guaranteed because Electron-builder and dependency metadata may introduce environment-dependent differences. Functional equivalence can still be verified by building from the tagged source revision.

## How to use

1. Select **Edit current levels** and enter the real levels from your account.
2. Enter your current Guardian Points and hourly income.
3. Use `+`, `−`, the slider, or direct entry to build a plan.
4. Review the total cost and estimated time.
5. Optionally save the distribution as a named preset.

### Reset calculator

Open **Reset calculator** to enter all 16 current levels and your **Unspent Guardian Points** directly. Adjust each stat from **0 to 64** with `+`, `−`, a slider or direct entry. The calculator accepts each entered distribution without imposing the planner's ten-level mastery gates. **Guardian Points after reset** shows the unspent balance plus the cumulative cost of those levels. **Points invested** gives the total already spent, with a breakdown for Warrior, Ranged, Tank and Support.

You can fill the calculator manually or copy a distribution:

- **Use saved account**, in the calculator, copies your saved current levels and current account Guardian Points.
- **Use planner distribution**, in the calculator, copies the Planner's planned levels and current account Guardian Points. It uses the manual plan, not the target optimizer's recommendation.
- **Calculate reset**, in the **Shared setup** preview, copies the linked levels into the calculator and opens its tab. It keeps the calculator's existing **Unspent Guardian Points**.

The calculator keeps its own levels and points when you change tabs or reopen the app. Editing them leaves your saved account, plan and optimizer targets unchanged. You do not need to set any levels to zero to calculate a reset.

For example, enter Warrior `17/3/0/0`, Ranged `0/20/0/0`, Tank `10/0/0/0` and Support `10/0/0/0` in ATK/HP/DEF/Skill Damage order. These levels contain **7,420,000 GP**. Adding **2,000,000 GP** unspent gives **9,420,000 GP** after reset.

This calculation estimates the Guardian Point budget for a reset; it does not perform a reset in the game or include any diamond cost.

### Target optimizer

1. Open **Target optimizer**.
2. Enter the desired level for each relevant stat.
3. Review the recommended legal distribution, total cost, and ETA.
4. Use **Reset targets** to return every target to the current account levels.
5. Select **Apply this plan** to copy the result into the planner.

The optimizer keeps your entered targets when you change tabs or reopen the app. **Optimize this plan** explicitly copies the planner values into the target editor. A target below your real level never downgrades an already purchased stat.

Compare the recommended distribution against a saved preset using the same account and income. **Save result** stores the recommended distribution; **Save preset** on the Planner stores the manual plan.

Presets are distribution templates, not complete account backups. Loading one never lowers real levels; it recalculates any missing prerequisites for your current account. A manual reduction that would invalidate another class's gate is refused with an explanation. Reduce the dependent class first, or reset the plan.

## Data and privacy

Levels, resources, plans, targets, presets and the reset calculator's independent inputs are stored locally. Web, installed web app, and desktop storage may differ according to browser/profile; there is no cloud synchronization. Clearing browser site data can remove your saves. Private browsing or full storage can prevent saving; the interface reports **Not saved** instead of claiming success.

- **Export backup** downloads a JSON file containing the account, resources, plan, targets, all presets and the reset calculator's inputs. Keep it somewhere safe.
- **Import backup** validates that file and previews the replacement before confirmation. This is also how to transfer data between devices or web and desktop.
- **Share setup** includes only the 16 target levels in the URL fragment, not your points, income or preset names. Opening it previews the setup; accepting changes targets only.
- Old local saves migrate automatically. If saved data is malformed, automatic saving pauses to avoid overwriting it. Download the recovery file before importing a valid backup or starting again. The recovery file preserves raw data for diagnosis; it is not itself an importable backup.
- Plans, targets and presets from earlier releases are limited to level 64 when loaded. Shared setup links containing levels above 64 are rejected. Saved real account levels above 64 are not silently changed: loading pauses with recovery data available so that the original values remain recoverable.
- Deleting a preset or clearing all data requires confirmation.

The app has no analytics, login, or game-account integration. Hosting providers still receive normal page/asset requests; do not put personal information in a shared link. The offline cache contains application files, not a cloud copy of your planner data.

## Development

Requirements:

- Node.js 24 LTS and npm (minimum supported Node 22.13)
- Windows/macOS/Linux for web development; the matching native OS for packaging desktop releases
- npm

```powershell
npm ci
npm run dev
```

Useful commands:

```powershell
npm run check                 # ESLint, TypeScript, engine/storage tests, production web build
npx playwright install chromium
npm run test:ui               # Isolated browser tests, including offline reload and backups
npm run desktop:bundle       # Shared UI bundled for Electron file:// loading
npm run desktop:build        # Check + package Windows portable application
npm run desktop:mac          # Check + package macOS application (on a Mac)
npm run desktop:smoke        # Launch and verify the native packaged app
npm run format              # Format source/configuration
```

The Windows output is generated in `release/`. Build directories are ignored by Git and should not be committed.

### Publication with GitHub Actions

- **CI** validates pull requests with type checks, unit tests and browser scenarios. No secrets are needed for contributors.
- **Deploy web app to GitHub Pages** validates pushes to `main`, builds `dist/` and deploys only if checks pass. In the repository's **Settings → Pages**, choose **GitHub Actions** as the source (not your account-wide Pages settings).
- **Build desktop releases** replaces the old macOS-only workflow. Run it from **Actions → Build desktop releases → Run workflow** to obtain Windows x64, macOS Intel and macOS Apple Silicon artifacts. Each native runner launches the packaged application before uploading it.
- For a release, update `package.json`, regenerate the lock with `npm install --package-lock-only`, update `CHANGELOG.md`, commit, and push a tag exactly matching the package version (e.g. `v0.4.0`). Only after all native builds pass does the workflow create a **draft** GitHub Release with packages and checksums. Review its notes, test the downloads and press **Publish release**. A manual workflow run creates artifacts but does not publish a release. Existing published release files are never overwritten automatically.

No signing certificates are included. Publisher signing/notarization needs the maintainer's own credentials and is intentionally not configured; macOS uses ad-hoc signing only. Tests are not a guarantee against every OS/browser issue; please report problems with the visible version/build number.

## Project structure

- `app/game/mastery.ts` — costs, gates, bonuses, ETA, and optimizer engine.
- `app/page.tsx` — planner, presets, comparisons, sharing and optimizer views.
- `app/state.ts` / `app/usePlanner.ts` — versioned persistence, validation, backup/migration and save status.
- `app/components/` — shared dialogs and keyboard-safe level input.
- `app/pwa.tsx` — offline/update notices for the web build.
- `electron/main.cjs` — Electron window and local bundle loader.
- `desktop/` — shared web/desktop React entry point (Vite; no server required).
- `Assets/` — source artwork used by the application.
- `tests/` — browser regression tests; engine/storage tests sit alongside their modules.
- `.github/workflows/` — verification, Pages deployment, native packages/draft releases.

## Upgrade-cost mathematics

Each individual stat has a maximum level of **64**. Class mastery is the sum of the class's four stat levels, so a class total of **92**, for example, is valid within the shared mastery gates. The planner uses the observed costs through stat level 64. Shared mastery gates still apply when planning upgrades.

### Growth inside a block

Let `L` be the current level, so `C(L)` is the price of upgrading from `L` to `L + 1`. Let `B` be the starting price of the current ten-level block and `r = L mod 10` be the position inside that block.

```text
C(L) = B × (1 + 0.05 × r)
```

Each successive upgrade adds 5% of the block's starting price. For the 50–59 block, `B = 4,000,000`. Therefore:

```text
C(53) = 4,000,000 × (1 + 0.05 × 3)
      = 4,600,000 GP
```

### Evolution of the block base

| Current-level range | Starting cost B | Destination levels |
| ------------------- | --------------: | ------------------ |
| 0–9                 |          80,000 | 1–10               |
| 10–19               |         160,000 | 11–20              |
| 20–29               |         320,000 | 21–30              |
| 30–39               |         640,000 | 31–40              |
| 40–49               |       1,600,000 | 41–50              |
| 50–59               |       4,000,000 | 51–60              |
| 60–63               |      10,000,000 | 61–64              |

Before level 40, the base doubles every ten levels:

```text
B(n) = 80,000 × 2^n
```

Starting at level 40, the observed bases follow a ×2.5 regime:

```text
C(L) = 1,600,000
     × 2.5^floor((L - 40) / 10)
     × (1 + 0.05 × (L mod 10))
```

### Latest level costs

The screenshot supplied for the level-64 update lists the cost of reaching each destination level, not the cost of upgrading from that level:

| Destination level | Upgrade cost (GP) |
| ----------------- | ----------------: |
| 46                |         2,000,000 |
| 47                |         2,080,000 |
| 48                |         2,160,000 |
| 49                |         2,240,000 |
| 50                |         2,320,000 |
| 51                |         4,000,000 |
| 52                |         4,200,000 |
| 53                |         4,400,000 |
| 54                |         4,600,000 |
| 55                |         4,800,000 |
| 56                |         5,000,000 |
| 57                |         5,200,000 |
| 58                |         5,400,000 |
| 59                |         5,600,000 |
| 60                |         5,800,000 |
| 61                |        10,000,000 |
| 62                |        10,500,000 |
| 63                |        11,000,000 |
| 64                |        11,500,000 |

### Guardian Points after reset

For a stat currently at level `N`, the spent amount is the sum of every upgrade from 0→1 through `N−1`→`N`. Sum that amount for all four stats in all four classes, then add the current unspent balance:

```text
Reset total = Current Guardian Points
            + Σ (cumulative cost from 0 to each of the 16 current levels)
```

For example, if all 16 stats are at level 1, they contain `16 × 80,000 = 1,280,000 GP`. With a current balance of `500,000 GP`, the reset total is `1,780,000 GP`.

## Contributing

Bug reports and pull requests are welcome. Please include reproduction steps and run `npm run check` before submitting code changes.

## License

Released under the [MIT License](LICENSE).
