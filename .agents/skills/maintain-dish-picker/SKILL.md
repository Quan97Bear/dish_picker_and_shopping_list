---
name: maintain-dish-picker
description: Maintain and verify the Tonight's Menu static dish picker. Use for changes to deployed or catalog dish data, dietary filters, dish selection and notes, servings, share URL state, recipient recipes, shopping-list merging, responsive picker UI, or deployment behavior in this repository.
---

# Maintain Dish Picker

Preserve the app's static architecture and the deployed-menu invariants while changing one user flow at a time. Read the root `AGENTS.md` before applying this workflow.

## Choose the path

- For menu rotation or recipe edits, follow **Maintain menu data**.
- For picker, note, dietary-filter, sharing, recipient, or shopping-list behavior, follow **Maintain application state**.
- For layout, styling, or motion, follow **Maintain the interface**.
- Combine the paths only when the requested behavior crosses those boundaries.

## Maintain menu data

1. Inspect `data/dishes.json`, `data/dish-index.json`, `data/dish-catalog.json`, the schema, aliases, and `scripts/validate-data.mjs` before editing.
2. Keep the deployed detail and index sets identical: 40 stable IDs, exactly 5 soups, no eggplant, and no fish. Keep green and pointed peppers available.
3. Treat the catalog as a local rotation pool. Promote a catalog dish only after completing and reviewing its ingredients, quantities, steps, source, category, and `avoid` metadata.
4. Update the detail and lightweight index together. Add an alias instead of silently breaking a published ID.
5. Run `npm run validate:data` and `npm test`. Do not weaken validation to make invalid data pass.

## Maintain application state

1. Trace the state through selection, local persistence, share encoding/decoding, recipient rendering, and shopping-list generation before changing its representation.
2. Preserve old shared URLs when extending the protocol. Reject or ignore malformed IDs, servings, notes, and versions safely.
3. Keep per-dish notes at 80 characters or fewer and visible to the recipient. Do not put sensitive information into examples or fixtures.
4. Apply dietary exclusions consistently to visible choices and already selected dishes. Keep each filter driven by dish metadata instead of dish-name guesses.
5. Merge shopping items only when ingredient keys and units are compatible.
6. Add or update focused Vitest coverage, then run `npm test` and `npm run build`. Run the relevant Playwright flow when available.

## Maintain the interface

1. Inspect the live page at a mobile viewport before editing. Identify the exact sticky, scrolling, popover, drawer, or card state involved.
2. Preserve semantic buttons, labels, keyboard focus, 44 px touch targets, reduced motion, and contrast support.
3. Use category emoji for dish visuals unless the user explicitly requests a different image system.
4. Keep motion short, spatially consistent, and interruptible. Avoid decorative animation that competes with choosing dishes.
5. After editing, run `npm test` and `npm run build`, then inspect the picker and affected overlay at approximately 360 px width. Check overlap, clipping, sticky transitions, focus, and horizontal scrolling.

## Finish

Summarize the changed user-visible behavior, list the validation performed, and call out any skipped browser or end-to-end check with the reason.
