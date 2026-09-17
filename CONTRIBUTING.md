# Contributing

1. Create a branch from the default branch.
2. Use Node.js 24 LTS and install the locked dependencies with `npm ci`.
3. Make focused changes and add or update tests when modifying the mastery engine.
4. Run `npm run check`, then `npx playwright install chromium` and `npm run test:ui`. On Linux, use `npx playwright install --with-deps chromium`.
5. Open a pull request describing the change and how it was verified.

Please do not commit generated directories such as `desktop-dist`, `release`, `.next`, or `dist`.

Keep cost formulas, gates and optimization independent of React in `app/game/mastery.ts`. Tests should check every intermediate route is legal, never decreases real levels, and reaches all requested targets. Preserve the explicit speculative status of levels 71–90; do not present extrapolated prices as observed game data.

For persistence changes, add migration and corrupt-input tests. Never test with, clear or overwrite a user's real local storage/profile; browser and desktop smoke tests use isolated data. Keep the application ID and existing data directory stable across updates.

Run `npm run format` before review. If dependencies change, update both `package.json` and `package-lock.json`, and verify a fresh `npm ci`. Packaging changes should additionally pass `npm run desktop:smoke` on the corresponding native OS after a build. Do not upload executables as source files; release automation attaches them to draft releases.
