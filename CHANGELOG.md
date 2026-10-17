# Changelog

## Unreleased

- Set the individual mastery-level maximum to 64, verified the latest destination-level costs, and removed speculative higher-level planning.
- Added Guardian Points after reset: the current balance plus all points invested across the 16 current mastery levels, with guidance for comparing a fresh build in the target optimizer.
- Adapted older plans, targets and presets to the level-64 cap while preserving invalid real account levels through the existing recovery flow; shared setup links above the cap are rejected.
- Added Japanese, Spanish and Simplified Chinese translations with a five-language selector, localized durations and persistent preference.
- Added an English/Korean language switch with a persistent device-local preference.
- Localized the planner, optimizer, routes, dialogs, validation/storage notices, accessibility labels, dates and durations without changing saved account data.

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
