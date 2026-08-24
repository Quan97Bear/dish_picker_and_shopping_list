# AI Entry Point

This is the first document an AI agent should use in this repository. It defines
what to read next, which document owns each kind of information, and the
constraints that must survive every change.

## Default communication style

- Apply the project-local `.agents/skills/i-have-adhd/SKILL.md` skill to every
  task in this repository without
  requiring an explicit invocation.
- Read it completely at the start of each new task and follow its output rules.
- Keep it active until the user explicitly says `stop adhd mode` or
  `normal mode`.
- This affects communication only. Safety requirements, the user's requested
  format, and the project rules below take precedence where they conflict.

## Start every task here

1. Read only the **Resume here** section at the top of `docs/TODO.md`. Treat its
   single `NOW` item as the current work unless the user's latest instruction
   replaces it.
2. Read the relevant parts of `docs/PROJECT_STATUS.md` to confirm deployed facts,
   known issues, or blockers that affect `NOW`.
3. Read only the documents needed for the request:
   - Product behavior or acceptance criteria: `docs/PRODUCT_REQUIREMENTS.md`
   - Approved future work or architecture: `docs/PRODUCT_ROADMAP.md`
   - Local commands, data files, or deployment: `README.md`
   - Recipe attribution and license context: `NOTICE.md`
4. Read `.agents/skills/maintain-dish-picker/SKILL.md` before changing app
   behavior, menu data, roadmap state, or deployment.
5. For visual changes, also read the installed `apple-design` and
   `frontend-design-principles` skills.

Do not read every document by default. The routing above is designed to avoid
loading the same context twice.

## Deterministic local workflows

When the user requests one of these workflows without asking for a code change,
use the named package script instead of reconstructing an ad hoc command chain:

| User intent | Action |
| --- | --- |
| `开手机Demo`, `手机Demo`, or `phone demo` | Reuse this project’s active port 5173 Vite server; otherwise run `npm run demo:phone`, then report the Network URL |
| `关闭手机Demo`, `kill phone demo`, or `stop demo` | Run `npm run demo:stop` |
| `跑快检` or `quick test` | Run `npm run check:fast` |
| `跑手机检查` or `quick phone test` | Run `npm run check:phone` |
| `跑全检` or `full test` | Run `npm run check:full` |
| `检查文档` | Run `npm run validate:docs` |

`demo:phone` does not require a build and should remain running for later phone
checks. Do not restart it when the current project is already listening on port
5173. `demo:stop` may stop only a port 5173 listener whose working directory is
this repository. The other workflows are finite and must report the failing
stage if they do not pass. If npm is unavailable in a managed Codex shell, use
the detected workspace Node runtime to run `scripts/run-workflow.mjs` for the
demo and check workflows. Run `scripts/validate-docs.mjs` directly for
`validate:docs`. Do not install npm or reconstruct the steps.

## How to answer “what is unfinished?”

Use this order:

1. Report the single `NOW` item in `docs/TODO.md` **Resume here**.
2. If `NOW` is absent, report the first item in `NEXT`; only then inspect the
   detailed checklist for an in-progress, awaiting-verification, or unchecked
   item.
3. Mention blockers from `docs/PROJECT_STATUS.md`.
4. Recommend one bounded next work unit; do not propose starting a later phase
   while an earlier priority is unfinished.

At the end of any implementation session:

- Keep exactly one item under `NOW` in `docs/TODO.md` **Resume here**. Record its
  start action, acceptance criteria, result location, blockers, and the item
  that becomes `NOW` after completion.
- Add the last verified result with its date, then update `NEXT` and remaining
  validation before ending the session.
- Check an item only after its acceptance checks pass.
- Update `docs/PROJECT_STATUS.md` only after user-visible behavior is deployed and
  verified in production.
- Update the PRD only when the product contract changes.
- Update the roadmap only when scope, priority, architecture, or acceptance
  criteria change.

## Document ownership

| File | Owns | Must not duplicate |
| --- | --- | --- |
| `AGENTS.md` | AI reading order, maintenance rules, invariant guardrails | Feature backlog or release history |
| `docs/PROJECT_STATUS.md` | Current production truth, current defects, handoff | Detailed future designs |
| `docs/TODO.md` | Work state, next action, task checklist | Product rationale or full specifications |
| `docs/PRODUCT_REQUIREMENTS.md` | Stable product contract and acceptance rules | Task status or implementation plan |
| `docs/PRODUCT_ROADMAP.md` | Approved future scope, priority, architecture | Deployed feature inventory |
| `README.md` | Human quick start, commands, paths, deployment | Product specification |
| `NOTICE.md` | Attribution and license notice | General project status |

When information conflicts, use this precedence:

1. User’s latest explicit instruction
2. `AGENTS.md` engineering constraints
3. PRD product contract
4. `docs/PROJECT_STATUS.md` for what is actually deployed
5. Roadmap and TODO for future intent and execution state

## Product and architecture guardrails

- This is a mobile-first Chinese menu picker, recipe viewer, and shopping-list
  app.
- P0 and P1 remain account-free, backend-free, database-free, and usable
  without runtime access to GitHub or paid APIs.
- Do not add Worker, Durable Objects, D1, authentication, or cloud profiles
  until the user explicitly starts P2.
- Preserve old static share URLs when future architecture is introduced.
- Do not describe planned behavior as implemented.

## Runtime menu invariants

- `data/dishes.json` and `data/dish-index.json` contain the same 40 stable dish
  IDs.
- Exactly 5 deployed dishes have category `soup`.
- The deployed 40 contain no eggplant or fish. Green and pointed peppers are
  allowed.
- `data/dish-catalog.json` is a local rotation pool and must not be requested at
  runtime or shipped as runtime menu data.
- `data/ingredient-guide.json` contains every ingredient key used by the runtime
  menu. One key represents one interchangeable ingredient; canonical names and
  aliases are unique, and every dish ingredient has exactly one core,
  auxiliary, or optional role.
- Use `data/aliases.json` for published-ID compatibility.
- Keep `avoid` metadata accurate for green/pointed pepper, fish, pork, egg, and
  spicy food.

## State and interaction guardrails

- Per-dish notes are at most 80 characters and new-dish suggestions are at most
  60 characters.
- Preserve dish IDs, servings, notes, suggestions, and protocol version in
  share URLs; ignore invalid IDs safely.
- Dietary filters hide conflicting candidates. They must never silently delete
  selected dishes, notes, or ordering.
- Merge shopping items only when ingredient key, unit, and optional state are
  compatible. Keep the source dish names.
- Keep recipe provenance in data and maintenance records, not in the
  user-facing recipe UI.
- Use category emoji unless the user explicitly chooses another image system.

## UI guardrails

- Optimize first for a 360px-wide phone and prevent horizontal page scrolling.
- Keep semantic controls, visible keyboard focus, reduced-motion support, and
  effective touch targets of at least 44×44 CSS pixels.
- Preserve sticky category controls, compact search transition, and compact
  expandable dietary controls until an approved redesign replaces them.
- Keep `html`, `body`, the site header, sticky toolbar, and dish preview on the
  same opaque cream canvas. Sticky state changes layout, not color.
- Keep page content below the iOS status bar and preserve scroll position when
  opening or closing a dish preview.
- Preserve user-selectable large and compact candidate modes. Compact cards
  keep an approximately 160px minimum width, use two columns on iPhone 14, and
  add columns only when the available width supports them without overflow.
- Never expose duplicate header and floating menu entries to assistive
  technology.
- Center close, delete, edit, plus, minus, and disclosure icons optically.
- Servings must update in place without rebuilding the drawer.
- Verify fixed and floating controls with iOS safe areas and a WeChat-like
  embedded viewport.

## Important code paths

- `src/features/picker/`: picker, filters, menu entry, selection interactions
- `src/features/recipient/`: recipes and shopping list
- `src/domain/menu-state.js`: persisted and shared state
- `src/domain/shopping-list.js`: ingredient scaling and merging
- `src/domain/ingredient-guide.js`: ingredient identity, aliases, roles, and validation
- `src/infrastructure/load-app-data.js`: runtime data loading and validation
- `src/shared/`: system share, QR and toast utilities
- `src/styles.css`: responsive layout, motion, and accessibility
- `scripts/validate-data.mjs`: runtime-menu invariants

## Verification

- Require Node.js 20 or newer.
- Documentation-only changes: `npm run validate:docs`.
- Routine data or implementation changes: `npm run check:fast`.
- iOS canvas, safe-area, sticky, preview, or phone viewport changes:
  `npm run check:phone` in addition to the focused implementation tests.
- Selection, notes, sharing, recipient, shopping, or release candidates:
  `npm run check:full`.
- UI changes: inspect the affected flow near 360px and check overlap, clipping,
  horizontal scrolling, focus, safe areas, and embedded-browser behavior.
- Do not add or upgrade production dependencies unless the requested feature
  requires it.

## Deployment

- Canonical target: Cloudflare Pages project `dish-picker` at
  `https://dish-picker.pages.dev`.
- Deploy only generated `dist/`, never the repository root.
- Keep AGENTS, `.agents/`, `.codex/`, docs, tests, maintenance scripts,
  maintenance-only data, lockfiles, and source maps out of production.
- Keep `npm run build` wired to `scripts/validate-deploy.mjs`.
- Manual release:

  ```bash
  npm run validate:data
  npm test
  npm run build
  npx wrangler pages deploy dist --project-name dish-picker --branch main
  ```

- Verify the canonical domain references the new asset hashes.
- Do not deploy to ChatGPT Sites unless the user explicitly replaces the
  canonical hosting decision.
