# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install
npm run dev        # dev server on http://localhost:5173
npm run build      # tsc -b && vite build → dist/
npm run preview    # serve the production build
npm run typecheck  # tsc -b --noEmit
npm run lint       # eslint .
npm test           # vitest run
npm run test:watch # vitest
npm run seed       # regenerate supabase/seed.sql from src/data/
```

There is ESLint, tests, and CI. `.github/workflows/ci.yml` runs lint → typecheck → tests → build on every pull request and on pushes to `master`; `.github/workflows/deploy.yml` publishes to Pages separately. `npm run build` typechecks before bundling, so a type error fails the build. `tsc -b` is incremental via `tsconfig.tsbuildinfo`; if typecheck results look stale, delete that file.

**Node ≥ 22.19 is required** (`package.json` `engines`, both workflows pinned to Node 24) — `jsdom` (`*.test.tsx`) requires `^22.22.2 || ^24.15.0 || >=26.0.0`, and its `undici` dependency requires `>=22.19.0`. On an older Node, every jsdom-environment test file fails to even start its worker (`webidl.util.markAsUncloneable is not a function`) while the `node`-environment tests still pass — a confusing split failure that looks like broken code rather than a runtime mismatch. This bit CI once already, pinned at Node 20.

`eslint.config.js` only enables `react-hooks/rules-of-hooks` and `react-hooks/exhaustive-deps`, not the plugin's full `recommended` config. Since v7 that config pulls in the React Compiler ruleset (`purity`, `refs`, `set-state-in-effect`, `immutability`, …), and those rules flag `usePersistentState`'s synchronous re-read on key change — the deliberate, tested fix for the note-overwrite bug — as an anti-pattern. Adopting the full set is a separate initiative (preparing for a compiler this project doesn't use); don't widen `extends` to `reactHooks.configs.recommended` without doing that work first.

Tests live next to their subject, and **the extension picks the runner** (`vitest.config.ts` defines two projects):

- **`*.test.ts` — pure functions, `node` environment.** No DOM, no renderer; these stay in the millisecond range. Keep logic testable by extracting it as a pure function over its inputs (as `scoreOf` in `useSession.ts` does) rather than reading `Date.now()`, `Math.random()` or hook state directly.
- **`*.test.tsx` — components, `jsdom` + Testing Library.** `src/test/setup.ts` runs first: it clears `localStorage` and the theme attribute between tests, and supplies the `matchMedia` that jsdom lacks but `useIsDesktop()` calls on nearly every screen (it reads `window.innerWidth`, so a test can render the phone layout by setting it).

Both are inside `include`, so `npm run typecheck` checks them, and neither is imported by the app, so they stay out of the bundle.

The render tests are not there for coverage — each one pins a bug that actually shipped: the chapter note overwritten when the question changed (data loss), "Predă lucrarea" deleting the whole exam, the theme saved as JSON but compared unquoted, a corrupt `localStorage` payload whitening the page. Each was confirmed by reintroducing the original bug and watching the test fail. **When you fix a user-visible bug, add the test the same way** — and if a new test passes against the broken code, it is not testing what you think.

## Language

UI strings, code comments, and domain identifiers are **Romanian** (`materie`, `grile`, `capitol`, `simulare`, `setari`, `acasa`, `InLucru`). Match this convention — do not translate identifiers or comments to English.

## Architecture

Client-side React 19 + TypeScript + Vite SPA. No backend, no API calls yet — that's Faza 3. All content is hardcoded in `src/data/`; all user state lives in React state or `localStorage`. The one environment variable that exists, `VITE_SENTRY_DSN`, is optional and documented below; there are still no secrets checked in or otherwise required for the app to run.

### Routing — `src/lib/router.ts`

Hash-based, no router dependency. The `SCREENS` tuple is the single source of truth for valid routes and derives the `Screen` type. Two lists govern behavior:

- `SCREENS` — every valid `#/route`; an unknown hash falls back to `acasa`.
- `BUILT_SCREENS` — screens with a real implementation. Anything in `SCREENS` but *not* in `BUILT_SCREENS` automatically renders the `InLucru` ("work in progress") placeholder, labelled from `SCREEN_TITLES`.

`plan` sits in `SCREENS` but not in `BUILT_SCREENS` on purpose: the screen existed but was drawn entirely from fixed data — weeks hardcoded to August–September and "ai rămas în urmă cu 1 zi", against an exam in July 2027. It is a placeholder until a plan can be generated from a real study pace.

**Adding a screen requires coordinated edits**: add the id to `SCREENS`, add it to `BUILT_SCREENS`, add a `case` in `Content()` in `src/App.tsx`, and add nav entries in `src/components/Sidebar.tsx` and `src/components/MobileNav.tsx`.

### Global state — `src/state/AppState.tsx`

One React context provides everything: theme, role, selected `materie`, the admin draft, plus the two quiz engines. Components reach it via `useApp()`. There is no other state library and no prop-drilling of app state.

**`useSession()` and `useSimulare()` memoize their returned object.** `AppProvider`'s own `value` is wrapped in `useMemo`, but that only skips work when every dependency keeps its identity — and `session`/`sim` are two of those dependencies. Returning a fresh object literal from either hook on every render (as both used to) made the outer memo recompute unconditionally, defeating it. Preserve this when touching either hook: any new field returned from `useSession`/`useSimulare` needs a matching entry in that hook's own `useMemo` dependency array, or the fix regresses silently. `react-hooks/exhaustive-deps` (see below) catches a missing dependency but not a memo that's pointless because its inputs are never stable — that part has to be checked by eye, or by measuring, as it was here: instrumenting `addEventListener`/`removeEventListener` for 13 seconds is what showed a related plan claim — that a `Grile` keyboard listener was re-subscribing every second — didn't actually reproduce, since `AppProvider`'s clock is gated per-screen and doesn't tick on that screen at all.

### Two independent quiz engines (different persistence semantics)

- **`useSession`** (`src/state/useSession.ts`) — the free practice session. Purely in-memory (lost on reload, results included). Navigation is clamped at both ends, so the last question stays last. Once a question is revealed the answer is locked; `primary()` implements Enter = "check, then advance if already checked, then *finish* on the last question". A session has two phases, derived from `finishedAt` and exposed as `finished`: `Grile.tsx` renders `GrileRun` while it is false and the `GrileRezultat` score panel once true. `finish()` is idempotent (it freezes `durataMs`) and `restart()` clears everything including `startedAt`. Two aggregates, deliberately different: `tally` counts only *revealed* questions (the in-run legend), while `score` counts every *answered* one and reports `pct` against `total`, so unanswered questions count against you.

- **`useSimulare`** (`src/state/useSimulare.ts`) — the timed exam simulation. Persisted to `localStorage` as a `SimRun`. The countdown is **derived from an absolute `endsAt` timestamp** (`endsAt - now`), never decremented by a tick — this is deliberate, so time keeps running while the tab is closed. Preserve this design when editing: storing a "seconds remaining" counter would break the closed-tab guarantee.

  `phase` is derived, never stored: `!run ? 'config' : finishedAt !== null ? 'rezultat' : 'rulare'`. The effective `finishedAt` is `run.finishedAt ?? (expired ? run.endsAt : null)`, so **expiry ends the paper without losing it** and produces the same result after a reload. `finish()` records the submission time and is idempotent — it must never null the run, which is what used to delete the whole exam on "Predă lucrarea"; `reset()` is the one that discards it and returns to config. Scoring (`scoreOf`) is a pure function over `order`, and `answers`/`marks` are keyed by **position in `order`**, not by bank index — unlike `useSession`, which keys by bank index.

The simulation clock only ticks while its screen is open — `AppState.tsx` passes `useNow(screen === 'simulari')`.

`QUESTIONS` contains only ~6 entries, so `buildOrder()` repeats the bank to reach the configured question count.

### Persistence — `usePersistentState` in `src/lib/hooks.ts`

The only way state should touch `localStorage`. Keys are namespaced `medbuc.*` (`medbuc.theme`, `medbuc.setari`, `medbuc.sim.run`, and dynamic ones like `medbuc.note.${capId}`). It swallows storage errors, so private-mode/quota failures degrade to in-memory state instead of throwing.

Two behaviours to preserve:

- **The key may change while mounted** (`medbuc.note.${capId}` does exactly that). The hook stores `{ key, value }` together and re-reads synchronously when the key changes. Without this, the previous chapter's note stays on screen and the first keystroke overwrites the new chapter's saved note.
- **An optional third argument is a type guard** (`Validator<T>`). Anything stored that fails it — an older shape, a hand-edited value — is dropped *and removed from storage*, so a bad value cannot break the app on every reload. `useSimulare` passes `isSimRun` for `medbuc.sim.run`, the one payload complex enough to crash rendering. Add a validator whenever a persisted shape is more than a primitive.

`ErrorBoundary` (`src/components/ErrorBoundary.tsx`) wraps the whole app in `main.tsx` and offers "Șterge datele locale", which clears every `medbuc.*` key — the escape hatch for any persisted state that still manages to break rendering.

### Theming — two writers to keep in sync

1. An inline script in `index.html` sets `document.documentElement.dataset.theme` **before first paint** (from `localStorage` + `prefers-color-scheme`) so the page never flashes the wrong palette. It must parse the stored value as **JSON** — `usePersistentState` writes `"dark"` with quotes, and comparing against bare `dark` silently ignored every saved preference.
2. `toggleTheme()` in `AppState.tsx` writes *both* the DOM dataset and the persisted `medbuc.theme` value.

Changing theme logic in one place without the other causes a flash-of-wrong-theme on reload.

### Styling — deliberately split between CSS and typed inline styles

- `src/styles.css` — design tokens as CSS custom properties (ported verbatim from `design/MedBuc.dc.html`), with the dark palette under `[data-theme='dark']`, plus utility classes for anything inline styles cannot express: `.card`, `.btn-primary`, `.row-btn`, `.field`, hover/transition/animation states.
- `src/lib/ui.ts` — typed inline-style helpers (`SX = CSSProperties`) for layout and typography: `pageTitle`, `eyebrow`, `twoCol(isDesktop)`, `autoGrid`, `stack`, `segButton`, `statusChip`, `pctPill`, and the `SANS`/`SERIF` font constants.

Rule of thumb: **`className` for stateful/interactive styling, inline `style` from `lib/ui.ts` for layout and type.** Never hardcode colors — always reference tokens (`var(--brand)`, `var(--fg2)`, `var(--ok)`, `var(--bad)`) so both themes stay correct. The sidebar is the worked example: `.nav-item` lives in CSS because hover and the current-screen indicator (an `::before` bar keyed off `aria-current`) cannot be expressed inline.

### Icons — `src/components/Icon.tsx`

Font Awesome artwork, no Font Awesome runtime. Only `@fortawesome/free-solid-svg-icons` is installed — a package of plain data (`[width, height, , , pathData]`) that tree-shakes to just the icons imported. `Icon` renders that data as an inline `<svg>`.

Do **not** add `@fortawesome/fontawesome-svg-core` or `@fortawesome/react-fontawesome`: they were tried and cost **~100 KB** of runtime (DOM scanning, layers, masks) to draw static SVGs. With `Icon`, the same icons cost ~6 KB. Do not add the Font Awesome CDN either — it ships the whole set from a third-party origin on the critical path, which is both slower and a GDPR concern for EU users.

### Error reporting — `src/lib/sentry.ts`

`@sentry/react` is a real dependency, but it is **never in the main bundle**. `initSentry()` (called once, first line of `main.tsx`) checks `VITE_SENTRY_DSN` and only then does `import('@sentry/react')` — a dynamic import, so without a configured DSN the package is not fetched at all, and Rollup tree-shakes the whole branch away at build time (confirmed: build output has one chunk, same size as before Sentry was added). With a DSN, it becomes a second, separate chunk (~160 KB gzip) fetched asynchronously, after first paint, never blocking it.

`ErrorBoundary.componentDidCatch` calls `reportError(error, info.componentStack)`, not the SDK directly — `reportError` is safe to call unconditionally (no-op until the dynamic import resolves, never throws) so the boundary itself stays free of any Sentry-shaped import.

**Deliberately narrower than Sentry's own setup wizard suggests:** only error monitoring, `sendDefaultPii: false`, no Session Replay, no performance tracing. This project is EU-facing with likely-minor users; Session Replay records real interaction with the page and needs explicit consent before it's turned on, not silent opt-in at install time. Add it later, gated behind the consent flow from Faza 7 — not now.

`VITE_SENTRY_DSN` goes in `.env.local` (gitignored) for local dev, and as a `VITE_SENTRY_DSN` GitHub Actions secret for `deploy.yml` to bake into the published build. It's optional everywhere: CI and any build without it just produce an app with reporting off, not a failure.

### Responsive layout is JS-driven, not CSS-only

`useIsDesktop()` (`DESKTOP_QUERY`, min-width 960px) decides between `Sidebar` and `MobileNav` in `App.tsx`, and feeds layout helpers like `twoCol(isDesktop)`. Components render structurally different trees per breakpoint rather than relying on media queries alone.

### Data layer — `src/data/`

Typed constants standing in for a future API. `chapters.ts` (`MATERII` keyed by `MaterieId`), `questions.ts` (`QUESTIONS`, `OptionKey`), `profile.ts` (account/exam constants). `EXAM_DATE` in `profile.ts` drives every countdown via `daysUntil()` in `src/lib/time.ts` — dates are computed, never hardcoded in screens.

**No displayed number may be hand-written.** The data files used to carry a full fictional student — a 22-day streak, "1 407 grile rezolvate", per-chapter `done`/`pct`, ten months of score history, an exam history of papers never sat, an admin queue of 37 pending questions. None of it was computed, so none of it moved when you actually answered a question. It is gone, and the rule that replaced it is: **if a figure cannot be derived from what the student did or from the bank itself, the screen shows an empty state instead** (`src/components/EmptyState.tsx`, which says what to do to make data appear).

Concretely: `Chapter` carries no `total` — `chapterQuestionCount()` / `materieQuestionCount()` in `questions.ts` count the real bank, so the figure grows only as content is written and a chapter with nothing in it disables its own "Exersează" button. `ScoreChart` and `ChapterChart` take their data as props and render an empty state when there is none, rather than owning fabricated constants. When adding a screen, derive or omit — do not seed plausible-looking demo values, and do not restore a `pct` field to make a chart look fuller.

Counted figures still need Romanian grammar: `numar()` in `src/lib/text.ts` handles the `de` rule ("6 grile" but "20 de grile"). Use it instead of interpolating a bare number next to a noun.

### Feedback for actions — `src/state/ToastContext.tsx`

The counterpart to `EmptyState`: `EmptyState` says a screen has nothing yet, `useToast().notify(kind, message)` says an action just succeeded or failed. Before this there was no such mechanism anywhere in the app — a save with no visible result and a save that silently failed looked identical. `ToastProvider` is mounted in `main.tsx` outside `AppProvider`, since transient notifications don't belong in state that also holds session and exam data.

Not wired to a screen yet — there is no real async action to attach it to until Faza 3 adds one (Admin's save, exam submission feedback). It exists now, tested, the same way the Supabase schema was written and verified before anything used it: don't force a demo call onto an existing button just to prove the primitive works, that recreates exactly the fabricated-feedback problem this was built to solve.

**Questions have a stable `id`** (`QuestionId`, e.g. `bio-nervos-01`), and anything persisted or passed around must reference that id — never the array position. `QUESTION_BY_ID` / `questionById()` resolve it and `isQuestionId()` validates it. This is why `SimRun.order` stores ids: with positions, inserting one question into the middle of the bank silently rewrote the content of every saved paper. `QUESTION_BY_ID` is built at the bottom of the file, after `QUESTIONS` — building it earlier is a temporal-dead-zone crash at import time. Ids must be unique; a duplicate throws on module load rather than making a question unreachable.

**Chapters have the same treatment** (`ChapterId`, e.g. `bio-nervos`), for two reasons `nr` could not cover: under "Subiecte anterioare" `nr` is a *year* and 2026 holds two sessions, so `nr` repeats; and the note key used to embed the chapter *label* (`medbuc.note.03. Sistemul nervos`), so fixing a typo in a title orphaned the student's note. `CHAPTER_BY_ID` / `chapterById()` / `isChapterId()` mirror the question helpers and are likewise built after `MATERII`. Every `Chapter` also carries its `materie`, so a chapter id alone resolves to both the label (`chapterLabelById`) and the subject name (`materieNameOf`).

**A question stores only `capId`** — its subject and chapter label are derived through `questionMaterie()` / `questionCap()` rather than duplicated as free text, which is what let a question claim a chapter that did not exist.

Renaming a persisted key means the old one must be moved, not abandoned: `src/lib/migrations.ts` runs once from `main.tsx`, before the first render. `noteKeyMoves()` is the pure part and is tested; it never overwrites a newer note and leaves unrecognised keys alone rather than deleting someone's text.

### Database schema — `supabase/`

SQL for a backend that does not exist yet: the app still reads from `src/data/`, and nothing here is wired to it. The schema was written first, in SQL, so the model would be designed rather than translated from TypeScript types later. `supabase/README.md` carries the design decisions; the ones that constrain future work:

- **Content ids are human-written `text`** (`bio-nervos`, `bio-nervos-01`), not `uuid` — they are already the app's identity and are embedded in saved exam papers, so a simulation started before the migration stays valid after it.
- **`attempts` is a journal, not state.** One row per answer, the single source for progress, statistics and spaced repetition. Nothing stores a denormalised `pct` or `done` — that is exactly how the fabricated figures appeared. There are deliberately no `update`/`delete` policies on it.
- **`seed.sql` is generated** by `npm run seed` from `src/data/` and must never be hand-edited. Regenerate it after changing chapters or questions.

`schema.test.ts` and `rls.test.ts` run the migrations on a real Postgres in-process (PGlite, Postgres 18 in WebAssembly) rather than asserting on the SQL text. This matters most for RLS: **a wrong policy raises no error, it just shows someone else's data.** Every query in those tests goes through the `authenticated` role with a user id set on the request, the way a browser query arrives — `harness.ts` builds the Supabase-provided pieces the migrations depend on (`auth` schema, `auth.uid()`, the `anon`/`authenticated` roles). When adding a policy, add the test that fails without it; weakening `notes_proprii` to `using (true)` must break the isolation tests.

Note the harness detail that already bit once: it uses session-level `set role`, not `set local role`. Outside a transaction `set local` is silently ignored, queries keep running as the table owner, RLS is bypassed, and every isolation test passes while proving nothing.

## TypeScript constraints that bite

`tsconfig.json` is aggressive; these cause build failures that may be surprising:

- **`noUncheckedIndexedAccess`** — array/record indexing yields `T | undefined`. Existing code uses `!` or `??` fallbacks after indexing (e.g. `QUESTIONS[index] ?? QUESTIONS[0]!`). Follow that pattern.
- **`verbatimModuleSyntax`** — type-only imports must use `import type { ... }` (or inline `type` specifiers, as in `import { QUESTIONS, type Question }`).
- **`noUnusedLocals` / `noUnusedParameters`** — an unused variable fails the build, not just lints.

## Deployment

Pushing to `master` triggers `.github/workflows/deploy.yml`, which builds and publishes `dist/` to GitHub Pages: https://mancilamr28.github.io/medbuc/

`vite.config.ts` sets `base: '/medbuc/'` because the site is served from a repo subpath. If the repo is renamed or moved to a custom domain, that `base` must change or all asset URLs 404.

## Known placeholder

`public/logo-kitty.svg` is a stand-in mark. The intended PNG was never downloaded; to swap it, drop the file in `public/` and update the path in `src/components/Logo.tsx`.
