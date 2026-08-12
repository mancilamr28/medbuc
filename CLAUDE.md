# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install
npm run dev        # dev server on http://localhost:5173
npm run build      # tsc -b && vite build → dist/
npm run preview    # serve the production build
npm run typecheck  # tsc -b --noEmit
```

There is **no test framework and no linter** configured. `npm run build` is the only gate — it typechecks before bundling, so a type error fails the build. `tsc -b` is incremental via `tsconfig.tsbuildinfo`; if typecheck results look stale, delete that file.

## Language

UI strings, code comments, and domain identifiers are **Romanian** (`materie`, `grile`, `capitol`, `simulare`, `setari`, `acasa`, `InLucru`). Match this convention — do not translate identifiers or comments to English.

## Architecture

Client-side React 19 + TypeScript + Vite SPA. **No backend, no API calls, no environment variables, no secrets.** All content is hardcoded in `src/data/`; all user state lives in React state or `localStorage`.

### Routing — `src/lib/router.ts`

Hash-based, no router dependency. The `SCREENS` tuple is the single source of truth for valid routes and derives the `Screen` type. Two lists govern behavior:

- `SCREENS` — every valid `#/route`; an unknown hash falls back to `acasa`.
- `BUILT_SCREENS` — screens with a real implementation. Anything in `SCREENS` but *not* in `BUILT_SCREENS` automatically renders the `InLucru` ("work in progress") placeholder, labelled from `SCREEN_TITLES`.

**Adding a screen requires coordinated edits**: add the id to `SCREENS`, add it to `BUILT_SCREENS`, add a `case` in `Content()` in `src/App.tsx`, and add nav entries in `src/components/Sidebar.tsx` and `src/components/MobileNav.tsx`.

### Global state — `src/state/AppState.tsx`

One React context provides everything: theme, role, selected `materie`, filters, settings, the admin draft, plus the two quiz engines. Components reach it via `useApp()`. There is no other state library and no prop-drilling of app state.

### Two independent quiz engines (different persistence semantics)

- **`useSession`** (`src/state/useSession.ts`) — the free practice session. Purely in-memory (lost on reload, results included). Navigation is clamped at both ends, so the last question stays last. Once a question is revealed the answer is locked; `primary()` implements Enter = "check, then advance if already checked, then *finish* on the last question". A session has two phases, derived from `finishedAt` and exposed as `finished`: `Grile.tsx` renders `GrileRun` while it is false and the `GrileRezultat` score panel once true. `finish()` is idempotent (it freezes `durataMs`) and `restart()` clears everything including `startedAt`. Two aggregates, deliberately different: `tally` counts only *revealed* questions (the in-run legend), while `score` counts every *answered* one and reports `pct` against `total`, so unanswered questions count against you.

- **`useSimulare`** (`src/state/useSimulare.ts`) — the timed exam simulation. Persisted to `localStorage` as a `SimRun`. The countdown is **derived from an absolute `endsAt` timestamp** (`endsAt - now`), never decremented by a tick — this is deliberate, so time keeps running while the tab is closed. Preserve this design when editing: storing a "seconds remaining" counter would break the closed-tab guarantee.

  `phase` is derived, never stored: `!run ? 'config' : finishedAt !== null ? 'rezultat' : 'rulare'`. The effective `finishedAt` is `run.finishedAt ?? (expired ? run.endsAt : null)`, so **expiry ends the paper without losing it** and produces the same result after a reload. `finish()` records the submission time and is idempotent — it must never null the run, which is what used to delete the whole exam on "Predă lucrarea"; `reset()` is the one that discards it and returns to config. Scoring (`scoreOf`) is a pure function over `order`, and `answers`/`marks` are keyed by **position in `order`**, not by bank index — unlike `useSession`, which keys by bank index.

The simulation clock only ticks while its screen is open — `AppState.tsx` passes `useNow(screen === 'simulari')`.

`QUESTIONS` contains only ~6 entries, so `buildOrder()` repeats the bank to reach the configured question count.

### Persistence — `usePersistentState` in `src/lib/hooks.ts`

The only way state should touch `localStorage`. Keys are namespaced `medbuc.*` (`medbuc.theme`, `medbuc.setari`, `medbuc.sim.run`, and dynamic ones like `medbuc.note.${cap}`). It swallows storage errors, so private-mode/quota failures degrade to in-memory state instead of throwing.

Two behaviours to preserve:

- **The key may change while mounted** (`medbuc.note.${cap}` does exactly that). The hook stores `{ key, value }` together and re-reads synchronously when the key changes. Without this, the previous chapter's note stays on screen and the first keystroke overwrites the new chapter's saved note.
- **An optional third argument is a type guard** (`Validator<T>`). Anything stored that fails it — an older shape, a hand-edited value — is dropped *and removed from storage*, so a bad value cannot break the app on every reload. `useSimulare` passes `isSimRun` for `medbuc.sim.run`, the one payload complex enough to crash rendering. Add a validator whenever a persisted shape is more than a primitive.

`ErrorBoundary` (`src/components/ErrorBoundary.tsx`) wraps the whole app in `main.tsx` and offers "Șterge datele locale", which clears every `medbuc.*` key — the escape hatch for any persisted state that still manages to break rendering.

### Theming — two writers to keep in sync

1. An inline script in `index.html` sets `document.documentElement.dataset.theme` **before first paint** (from `localStorage` + `prefers-color-scheme`) so the page never flashes the wrong palette. It must parse the stored value as **JSON** — `usePersistentState` writes `"dark"` with quotes, and comparing against bare `dark` silently ignored every saved preference.
2. `toggleTheme()` in `AppState.tsx` writes *both* the DOM dataset and the persisted `medbuc.theme` value.

Changing theme logic in one place without the other causes a flash-of-wrong-theme on reload.

### Styling — deliberately split between CSS and typed inline styles

- `src/styles.css` — design tokens as CSS custom properties (ported verbatim from `design/MedBuc.dc.html`), with the dark palette under `[data-theme='dark']`, plus utility classes for anything inline styles cannot express: `.card`, `.btn-primary`, `.row-btn`, `.field`, hover/transition/animation states.
- `src/lib/ui.ts` — typed inline-style helpers (`SX = CSSProperties`) for layout and typography: `pageTitle`, `eyebrow`, `twoCol(isDesktop)`, `autoGrid`, `stack`, `segButton`, `statusChip`, `pctPill`, and the `SANS`/`SERIF` font constants.

Rule of thumb: **`className` for stateful/interactive styling, inline `style` from `lib/ui.ts` for layout and type.** Never hardcode colors — always reference tokens (`var(--brand)`, `var(--fg2)`, `var(--ok)`, `var(--bad)`) so both themes stay correct.

### Responsive layout is JS-driven, not CSS-only

`useIsDesktop()` (`DESKTOP_QUERY`, min-width 960px) decides between `Sidebar` and `MobileNav` in `App.tsx`, and feeds layout helpers like `twoCol(isDesktop)`. Components render structurally different trees per breakpoint rather than relying on media queries alone.

### Data layer — `src/data/`

Typed constants standing in for a future API. `chapters.ts` (`MATERII` keyed by `MaterieId`), `questions.ts` (`QUESTIONS`, `OptionKey`), `profile.ts` (account/exam constants). `EXAM_DATE` in `profile.ts` drives every countdown via `daysUntil()` in `src/lib/time.ts` — dates are computed, never hardcoded in screens.

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
