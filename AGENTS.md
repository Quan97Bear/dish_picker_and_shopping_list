# Project Guidance

## Product

- This repository is a mobile-first, static Chinese menu picker and shopping-list app.
- Keep it account-free, backend-free, database-free, and usable without runtime access to GitHub or paid APIs.
- Treat `README.md` and the newest dated PRD change notes as the current product contract when older PRD sections still mention 30 dishes.

## Runtime menu invariants

- Ship exactly 40 complete dishes in `data/dishes.json` and the same 40 IDs in `data/dish-index.json`.
- Keep exactly 5 dishes whose category is `soup`.
- Do not include eggplant or fish in the deployed 40-dish menu. Green and pointed peppers are allowed.
- Keep `data/dish-catalog.json` as the local rotation pool; the app must not request it at runtime or include it as deployed runtime menu data.
- Preserve stable published dish IDs. Use `data/aliases.json` when an old shared link needs compatibility.
- Keep each dish's `avoid` metadata accurate for the supported filters: green/pointed pepper, fish, pork, egg, and spicy food.

## User flows

- The picker shows lightweight dish information; full ingredients and steps belong in recipient mode.
- A picker can attach a note of at most 80 characters to each selected dish. Preserve notes in the share URL and display them to the recipient.
- Preserve URL compatibility for dish IDs, servings, notes, and protocol version. Ignore invalid IDs safely.
- Keep shopping-list merging conservative: merge only compatible ingredient keys and units; never invent conversions.
- Use category emoji for dish visuals unless the user explicitly requests another image system. Do not restore abstract generated dish art.

## UI expectations

- Optimize first for a 360 px-wide phone and prevent horizontal page scrolling.
- Keep touch targets at least 44 by 44 CSS pixels, visible keyboard focus, semantic controls, and reduced-motion support.
- Preserve the sticky category controls, compact search transition, compact expandable dietary-filter control, and separation between dish categories and compact controls unless a requested redesign replaces them.
- For visual changes, follow the installed Apple-style principles with restrained materials and motion; verify the result in the browser rather than judging CSS alone.

## Important paths

- `src/ui/picker.js`: picker page and selection interactions.
- `src/ui/menu-drawer.js`: selected-menu drawer, notes, servings, and sharing.
- `src/ui/recipient.js`: recipient recipes and shopping-list presentation.
- `src/menu-state.js` and `src/utils/share.js`: persisted and shared menu state.
- `src/shopping-list.js`: ingredient merge behavior.
- `src/styles.css`: responsive styling and motion/accessibility behavior.
- `scripts/validate-data.mjs`: deploy-menu invariants.

## Verification

- Require Node.js 20 or newer.
- After data changes, run `npm run validate:data` and `npm test`.
- After JavaScript or CSS changes, run `npm test` and `npm run build`.
- Run `npm run test:e2e` for changes to selection, notes, share URLs, recipient mode, or shopping-list flows when the Playwright browser is available.
- For UI changes, also inspect the relevant flow at a mobile viewport and check for overlap, clipped controls, and horizontal scrolling.
- Do not add or upgrade production dependencies unless the requested feature genuinely requires it.

## Deployment hygiene

- Deploy only the generated `dist/` directory. Never configure a host to publish the repository root.
- Keep `AGENTS.md`, `.agents/`, `.codex/`, skills, tests, scripts, PRDs, maintenance-only data, lockfiles, and source maps out of production artifacts.
- Keep `npm run build` wired to `scripts/validate-deploy.mjs` so deployment fails if Codex instructions or development files leak into `dist/`.
- Do not solve deployment hygiene by deleting project guidance or skills; exclude them at the build and publish boundary.
