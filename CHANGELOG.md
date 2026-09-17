# Changelog

## 0.4.0

- Prevented manual reductions from breaking shared mastery gates; preset loads now adapt safely to current account levels.
- Preserved optimizer targets across navigation/restarts and made Save result save the actual recommendation.
- Added gate-by-gate purchase routes, cumulative cost/ETA, preset comparison and shareable target links.
- Added validated JSON backup/import previews, preset renaming and destructive-action confirmations.
- Added versioned save migration, recoverable corruption handling and honest storage error reporting.
- Fixed wallpaper loading on case-sensitive hosting, Warrior progress styling and stable lock-notice layout.
- Improved mobile layout, keyboard input, accessible dialogs and visible version/build identifiers.
- Added installable/offline web caching and an explicit update prompt.
- Replaced unused Next/server dependencies with a shared React/Vite build; updated Electron and build dependencies.
- Added native Windows/macOS packaging checks, isolated startup tests, SHA-256 checksums and draft-release automation.
- Windows is now distributed as one self-contained portable EXE; existing desktop user data stays in the same profile.

## 0.3.0

- Extended individual stat planning through level 90.
- Added speculative cost projections for levels 71–90.
- Added an in-app warning separating projections from confirmed costs.
- Documented the complete upgrade-cost formula and projected tables.

## 0.2.0

- Added direct level entry and per-stat sliders.
- Added the Target optimizer with cost and ETA estimates.
- Added named local presets with a limit of 10.
- Added category icons, wallpaper styling, and optimizer reset controls.
- Improved Electron offline packaging and local persistence.

## 0.1.0

- Initial Windows desktop planner.
