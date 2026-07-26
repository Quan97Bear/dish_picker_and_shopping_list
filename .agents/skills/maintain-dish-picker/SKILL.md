---
name: maintain-dish-picker
description: Maintain, verify, and deploy the Tonight's Menu static dish picker. Use for changes to deployed or catalog dish data, dietary filters, dish selection and notes, new-dish suggestions, servings, share URL state, recipient recipes, shopping-list merging, responsive picker UI, deployment artifacts, or the canonical Cloudflare Pages release in this repository.
---

# Maintain Dish Picker

Preserve the app's current static architecture and deployed-menu invariants while changing one user flow at a time. Start with the root `AGENTS.md`, then follow its task-based reading order. For implementation work, always read `docs/PROJECT_STATUS.md` and the **Resume here** section of `docs/TODO.md`; load the PRD or roadmap only when the request needs that specification. Do not treat a planned item as deployed behavior.

## Choose the path

- For menu rotation or recipe edits, follow **Maintain menu data**.
- For picker, note, dietary-filter, sharing, recipient, or shopping-list behavior, follow **Maintain application state**.
- For layout, styling, or motion, follow **Maintain the interface**.
- For approved future requirements or status changes, follow **Maintain roadmap state**.
- For explicitly authorized P2 multiplayer, identity, or cloud data, follow **Maintain backend evolution**.
- For a production release or hosting change, follow **Maintain deployment**.
- Combine the paths only when the requested behavior crosses those boundaries.

## Maintain menu data

1. Inspect `data/dishes.json`, `data/dish-index.json`, `data/dish-catalog.json`, the schema, aliases, and `scripts/validate-data.mjs` before editing.
2. Keep the deployed detail and index sets identical: 40 stable IDs, exactly 5 soups, no eggplant, and no fish. Keep green and pointed peppers available.
3. Treat the catalog as a local rotation pool. Promote a catalog dish only after completing and reviewing its ingredients, quantities, steps, source, category, and `avoid` metadata.
4. Update the detail and lightweight index together. Add an alias instead of silently breaking a published ID.
5. Run `npm run check:fast`. Do not weaken validation to make invalid data pass.

## Maintain application state

1. Trace the state through selection, local persistence, share encoding/decoding, recipient rendering, and shopping-list generation before changing its representation.
2. Preserve old shared URLs when extending the protocol. Reject or ignore malformed IDs, servings, notes, and versions safely.
3. Keep per-dish notes at 80 characters or fewer and visible to the recipient. Do not put sensitive information into examples or fixtures.
4. Apply dietary exclusions to visible candidates through dish metadata, not dish-name guesses. Never silently delete already selected dishes or notes when a filter changes; preserve them and surface a conflict warning.
5. Merge shopping items only when ingredient keys and units are compatible.
6. Keep each shopping item’s source dish names intact.
7. Add or update focused Vitest coverage, then run `npm run check:fast`. Run `npm run check:full` when the flow crosses selection, sharing, recipient, or shopping behavior.

## Maintain the interface

1. Inspect the live page at a mobile viewport before editing. Identify the exact sticky, scrolling, popover, drawer, or card state involved.
2. Preserve semantic buttons, labels, keyboard focus, 44 px touch targets, reduced motion, and contrast support.
3. Use category emoji for dish visuals unless the user explicitly requests a different image system.
4. Keep motion short, spatially consistent, and interruptible. Avoid decorative animation that competes with choosing dishes.
5. Update servings in place; never rebuild the whole drawer for a number change.
6. Preserve the implemented P1 picker controls: user-selectable large/compact candidate modes, compact cards with an approximately 160 px minimum width and responsive column count, SVG basket with integrated count badge and no Chinese label, stable sort select, and the lightweight flip preview. Treat preview-first results and share-after-preview ordering as approved future work until their TODO acceptance checks pass.
7. Keep the page canvas, site header, sticky toolbar, and preview background on the same opaque cream color. Keep page content below the iOS status bar and preserve scroll position through preview open and close.
8. After editing, run `npm run check:fast` and `npm run check:phone`, then inspect the picker and affected overlay at approximately 360 px width. Check overlap, clipping, sticky transitions, focus, safe-area behavior, and horizontal scrolling, including a WeChat-like viewport.

## Maintain roadmap state

1. Keep responsibilities separate: `AGENTS.md` is the AI entry point, `docs/PRODUCT_REQUIREMENTS.md` is the stable product contract, `docs/PROJECT_STATUS.md` is deployed fact and current defects, `docs/PRODUCT_ROADMAP.md` is approved future scope, and `docs/TODO.md` is execution and handoff state.
2. When a requirement is approved, update the roadmap and create or refine its TODO item.
3. When implementation starts, mark only the relevant TODO items in progress.
4. After tests pass but before deployment, mark the item as awaiting verification rather than complete.
5. After production verification, mark it complete and move the user-visible fact into `docs/PROJECT_STATUS.md`.
6. Do not copy the full roadmap into README or AGENTS.
7. Before ending a work session, refresh `docs/TODO.md` **Resume here** with the current item, exact next action, blockers, remaining validation, and deployment state.

## Maintain backend evolution

Use this path only when the user explicitly starts P2.

1. Keep active collaboration in a Durable Object per room; do not write every click permanently to D1.
2. Store only stable dish IDs, minimal profiles, preferences, finalized menus, and membership in D1. Do not duplicate static recipe details.
3. Preserve old URL-only sharing and account-free use.
4. Design migrations, expiry, deletion, export, retry, reconnect, concurrency, abuse limits, and rollback before production data is accepted.
5. Keep P2 bindings and deployments explicit. Do not silently convert a P0/P1 static release into a stateful deployment.
6. Add focused unit, integration, concurrency, reconnection, and migration coverage before release.

## Maintain deployment

1. Treat Cloudflare Pages project `dish-picker` and `https://dish-picker.pages.dev` as canonical unless the user explicitly changes providers.
2. Run `npm run check:full`.
3. Confirm `scripts/validate-deploy.mjs` passes and publish only `dist/`.
4. Deploy with an authenticated Wrangler session:

   ```bash
   npx wrangler pages deploy dist --project-name dish-picker --branch main
   ```

5. Confirm the canonical domain returns the new `index.html` asset hashes. Do not report completion based only on the temporary deployment URL.
6. Keep AGENTS, skills, docs, tests, scripts, maintenance-only data, lockfiles, and source maps out of production.
7. Do not use ChatGPT Sites unless the user explicitly replaces the canonical hosting decision.
8. Update roadmap/TODO status only after the matching verification and production checks actually succeed.

## Finish

Summarize the changed user-visible behavior, list the validation performed, identify the deployment target when relevant, and call out any skipped browser or end-to-end check with the reason.
