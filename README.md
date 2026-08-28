# Guardian Tales Mastery Planner

An offline Windows desktop application for planning Guardian Tales mastery upgrades without spending points in game.

> This is an unofficial fan-made tool. It is not affiliated with or endorsed by Kakao Games or Kong Studios.

## Features

- Plan all four mastery classes: Warrior, Ranged, Tank, and Support.
- Adjust stats with buttons, sliders, or direct level entry.
- Calculate Guardian Point cost, remaining balance, deficit, and ETA.
- Respect the shared mastery-cap rules while planning.
- Find a legal route to a target setup with the Target optimizer.
- Save, name, reload, and delete up to 10 local distribution presets.
- Store all data locally; no account, server, or internet connection is required.

## Installation

### Download the portable release

1. Open the repository's **Releases** page.
2. Download `Guardian-Tales-Mastery-Planner-<version>-Windows-x64.zip`.
3. Extract the complete ZIP to a folder.
4. Run `Guardian Tales Mastery Planner.exe` inside the extracted folder.

This is currently a **portable application**, not an installer. It does not add shortcuts, modify the Windows registry, or appear in “Installed apps”. To uninstall it, delete the extracted folder. Keep the executable beside its `resources` directory; moving only the `.exe` will break the application.

The application is currently unsigned, so Windows SmartScreen may display a warning. Select **More info**, verify the filename and publisher information, then choose **Run anyway** only if you downloaded it from this repository.

### Build it yourself from source

Anyone can audit the source and create the Windows build locally:

```powershell
git clone https://github.com/YOUR-USERNAME/guardian-tales-mastery-planner.git
cd guardian-tales-mastery-planner
npm ci
npm run check
npm run desktop:build
```

Replace `YOUR-USERNAME` with the GitHub account or organization that hosts the repository. GitHub’s green **Code** button also provides the exact clone command.

The unpacked application is generated under `release/win-unpacked`. The packaged JavaScript inside a release is bundled and minified, but it is produced from the source files in this repository. Users do not need to trust the uploaded ZIP blindly: they can review the code and compile their own copy.

Exact byte-for-byte reproducibility is not currently guaranteed because Electron-builder and dependency metadata may introduce environment-dependent differences. Functional equivalence can still be verified by building from the tagged source revision.

## How to use

1. Select **Edit current levels** and enter the real levels from your account.
2. Enter your current Guardian Points and hourly income.
3. Use `+`, `−`, the slider, or direct entry to build a plan.
4. Review the total cost and estimated time.
5. Optionally save the distribution as a named preset.

### Target optimizer

1. Open **Target optimizer**.
2. Enter the desired level for each relevant stat.
3. Review the recommended legal distribution, total cost, and ETA.
4. Use **Reset targets** to return every target to the current account levels.
5. Select **Apply this plan** to copy the result into the planner.

The optimizer prioritizes requested target upgrades. When mastery gates block progress, it adds the cheapest legal filler upgrade required to advance the shared cap.

## Data and privacy

Levels, resources, plans, and presets are stored in Electron's local browser storage on the user's computer. The application does not transmit account data.

## Development

Requirements:

- Windows 10 or 11
- Node.js 22.13 or newer
- npm

```powershell
npm install
npm run dev
```

Useful commands:

```powershell
npm test             # Run the mastery-engine tests
npm run lint         # Run ESLint
npm run desktop:bundle
npm run desktop:build
npm run check        # Lint, test, and build the desktop bundle
```

The Windows output is generated in `release/`. Build directories are ignored by Git and should not be committed.

## Project structure

- `app/game/mastery.ts` — costs, gates, bonuses, ETA, and optimizer engine.
- `app/page.tsx` — planner UI, local persistence, presets, and optimizer UI.
- `electron/main.cjs` — Electron window and local bundle loader.
- `desktop/` — Vite desktop entry point.
- `Assets/` — source artwork used by the application.

## Upgrade-cost mathematics

The cost curve combines linear growth inside each ten-level block with exponential growth between blocks.

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

| Current-level block | Starting cost B | Status         |
| ------------------- | --------------: | -------------- |
| 0–9                 |          80,000 | observed curve |
| 10–19               |         160,000 | observed curve |
| 20–29               |         320,000 | observed curve |
| 30–39               |         640,000 | observed curve |
| 40–49               |       1,600,000 | observed curve |
| 50–59               |       4,000,000 | observed curve |
| 60–69               |      10,000,000 | observed curve |
| 70–79               |      25,000,000 | speculative    |
| 80–89               |      62,500,000 | speculative    |

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

For example, the estimated 70→71 cost is:

```text
1,600,000 × 2.5^3 × (1 + 0.05 × 0)
= 25,000,000 GP
```

### Speculative levels 71–90

Costs above level 70 are estimates that assume the ×2.5 block scaling continues unchanged. They are not confirmed game data.

| Upgrade | Estimated cost |
| ------- | -------------: |
| 70→71   |     25,000,000 |
| 71→72   |     26,250,000 |
| 72→73   |     27,500,000 |
| 73→74   |     28,750,000 |
| 74→75   |     30,000,000 |
| 75→76   |     31,250,000 |
| 76→77   |     32,500,000 |
| 77→78   |     33,750,000 |
| 78→79   |     35,000,000 |
| 79→80   |     36,250,000 |
| 80→81   |     62,500,000 |
| 81→82   |     65,625,000 |
| 82→83   |     68,750,000 |
| 83→84   |     71,875,000 |
| 84→85   |     75,000,000 |
| 85→86   |     78,125,000 |
| 86→87   |     81,250,000 |
| 87→88   |     84,375,000 |
| 88→89   |     87,500,000 |
| 89→90   |     90,625,000 |

The important distinction is that the local progression is linear (`+5% of B` per level), while the global block progression is exponential (`B × 2.5` every ten levels). The application labels every projected cost above level 70 as speculative.

## Contributing

Bug reports and pull requests are welcome. Please include reproduction steps and run `npm run check` before submitting code changes.

## License

Released under the [MIT License](LICENSE).
