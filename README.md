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

## Cost-data limitation

Confirmed cost data currently covers individual stat levels 1–69. The UI does not invent unsupported costs beyond that range.

## Contributing

Bug reports and pull requests are welcome. Please include reproduction steps and run `npm run check` before submitting code changes.

## License

Released under the [MIT License](LICENSE).
