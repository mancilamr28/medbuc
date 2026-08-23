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

Run one test file, or one case by name:

```bash
npx vitest run src/state/useSession.test.ts     # one file
npx vitest run -t "predarea lucrării"           # one test/describe, by name
```

**The app needs Supabase env vars to boot at all.** `src/lib/supabase.ts` **throws at module load** without `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`, and `main.tsx` reaches that import before `createRoot()` — so a missing value is a white page with no `ErrorBoundary`, not a friendly message. Copy `.env.example` to `.env.local` (gitignored) before `npm run dev`. The publishable key is public by design; the real protection is RLS. `VITE_SENTRY_DSN` is the only optional one.

Note the gap this leaves: `ci.yml` builds with **no env vars at all** and still passes, because the throw is at runtime. `deploy.yml` is the workflow that injects them from repository secrets.

There is ESLint, tests, and CI. `.github/workflows/ci.yml` runs lint → typecheck → tests → build on every pull request and on pushes to `master`; `.github/workflows/deploy.yml` publishes to Pages separately. `npm run build` typechecks before bundling, so a type error fails the build. `tsc -b` is incremental via `tsconfig.tsbuildinfo`; if typecheck results look stale, delete that file.

**Node `^22.22.2 || ^24.15.0 || >=26.0.0` is required** — that range is `package.json` `engines`, and it comes from `jsdom` (`*.test.tsx`); its `undici` dependency additionally requires `>=22.19.0`. Both workflows are pinned to Node 24. On an older Node, every jsdom-environment test file fails to even start its worker (`webidl.util.markAsUncloneable is not a function`) while the `node`-environment tests still pass — a confusing split failure that looks like broken code rather than a runtime mismatch. This bit CI once already, pinned at Node 20.

`eslint.config.js` only enables `react-hooks/rules-of-hooks` and `react-hooks/exhaustive-deps`, not the plugin's full `recommended` config. Since v7 that config pulls in the React Compiler ruleset (`purity`, `refs`, `set-state-in-effect`, `immutability`, …), and those rules flag `usePersistentState`'s synchronous re-read on key change — the deliberate, tested fix for the note-overwrite bug — as an anti-pattern. Adopting the full set is a separate initiative (preparing for a compiler this project doesn't use); don't widen `extends` to `reactHooks.configs.recommended` without doing that work first.

Tests live next to their subject, and **the extension picks the runner** (`vitest.config.ts` defines two projects):

- **`*.test.ts` — pure functions, `node` environment.** No DOM, no renderer; these stay in the millisecond range. Keep logic testable by extracting it as a pure function over its inputs (as `scoreOf` in `useSession.ts` does) rather than reading `Date.now()`, `Math.random()` or hook state directly.
- **`*.test.tsx` — components, `jsdom` + Testing Library.** `src/test/setup.ts` runs first: it clears `localStorage` and the theme attribute between tests, and supplies the `matchMedia` that jsdom lacks but `useIsDesktop()` calls on nearly every screen (it reads `window.innerWidth`, so a test can render the phone layout by setting it).

Both are inside `include`, so `npm run typecheck` checks them, and neither is imported by the app, so they stay out of the bundle.

The render tests are not there for coverage — each one pins a bug that actually shipped: the chapter note overwritten when the question changed (data loss), "Predă lucrarea" deleting the whole exam, the theme saved as JSON but compared unquoted, a corrupt `localStorage` payload whitening the page. Each was confirmed by reintroducing the original bug and watching the test fail. **When you fix a user-visible bug, add the test the same way** — and if a new test passes against the broken code, it is not testing what you think.

## Language

UI strings, code comments, and domain identifiers are **Romanian** (`materie`, `grile`, `capitol`, `simulare`, `setari`, `acasa`, `InLucru`). Match this convention — do not translate identifiers or comments to English.

## Architecture

React 19 + TypeScript + Vite SPA on **Supabase** — Postgres, Auth and RLS. There is no server of our own: the browser talks to PostgREST directly, and every access rule is a policy in `supabase/migrations/`, not a check in a component.

Which layer owns what:

| Data | Lives in | Notes |
|---|---|---|
| Questions (`questions` + `question_options`) | Supabase | Written from Admin via the `salveaza_grila` RPC. `src/data/questions.ts` is now only a seed source and a test fixture — **adding a question there does not make it appear in the app** |
| Subjects and chapters (`materii`, `chapters`) | Supabase | Read at runtime into `ContentContext.taxonomie` and passed down as a value. `src/data/taxonomieSeed.ts` is **only** a seed source for `npm run seed` and a test fixture — nothing in the running app imports it |
| Answers (`attempts`) | Supabase | An immutable journal. Progress, statistics and the review queue are all *derived* from it — nothing stores a `pct` |
| Notes, theme, settings, exam-in-progress | `localStorage` | `medbuc.*`, via `usePersistentState`. The `notes` table exists but nothing writes to it yet |

**A practice session is memory-only** and syncs once, at `finish()`; **a simulation is never persisted at all** — there is no `syncFinishedSimulare` and `AttemptInsert.source` (`src/lib/attempts.ts`) cannot even express `'simulare'`, although the DB enum, the `sim_run_id` column and the Statistici filter all expect it. Consequences to know before touching that area: a finished exam contributes nothing to progress, its mistakes never reach Recapitulare, and Statistici's "Simulări" row is structurally always zero.

### Routing — `src/lib/router.ts`

Hash-based, no router dependency. The `SCREENS` tuple is the single source of truth for valid routes and derives the `Screen` type. Two lists govern behavior:

- `SCREENS` — every valid `#/route`; an unknown hash falls back to `acasa`.
- `BUILT_SCREENS` — screens with a real implementation. Anything in `SCREENS` but *not* in `BUILT_SCREENS` automatically renders the `InLucru` ("work in progress") placeholder, labelled from `SCREEN_TITLES`.

`plan` sits in `SCREENS` but not in `BUILT_SCREENS` on purpose: the screen existed but was drawn entirely from fixed data — weeks hardcoded to August–September and "ai rămas în urmă cu 1 zi", against an exam in July 2027. It is a placeholder until a plan can be generated from a real study pace.

**Adding a screen requires coordinated edits**: add the id to `SCREENS`, add it to `BUILT_SCREENS`, add a `case` in `Content()` in `src/App.tsx`, and add nav entries in `src/components/Sidebar.tsx` and `src/components/MobileNav.tsx`.

The same module also carries a second, disjoint route space for visitors without a session — see "The public route space" below. A page meant for logged-out visitors does **not** go in `SCREENS`.

### Global state — `src/state/AppState.tsx`

One React context provides everything: theme, screen, selected `materie`, the admin draft, plus the two quiz engines. Components reach it via `useApp()`. There is no other state library and no prop-drilling of app state.

Provider modules are component-only Fast Refresh boundaries. Each PascalCase `*Context.tsx`/`AppState.tsx` file exports its provider; the context, public types and consumer hook live in a distinct camelCase module (`appContextValue.ts`, `authState.ts`, `contentState.ts`, `progressState.ts`, `toastState.ts`). Import providers from the component module and hooks from the state module. Do not re-export a hook from the provider file: that recreates the `react-refresh/only-export-components` warning this split removed. `Sidebar.tsx` follows the same rule, with `useNavGroups` in its own module.

Account identity and role are deliberately **not** here — see the next section. `AppProvider` has no dependency on being logged in; it mounts and works the same whether `AuthContext` reports a user or not, the same way `ToastProvider` stays independent so transient notifications don't share a context with session/exam data.

**`useSession()` and `useSimulare()` memoize their returned object.** `AppProvider`'s own `value` is wrapped in `useMemo`, but that only skips work when every dependency keeps its identity — and `session`/`sim` are two of those dependencies. Returning a fresh object literal from either hook on every render (as both used to) made the outer memo recompute unconditionally, defeating it. Preserve this when touching either hook: any new field returned from `useSession`/`useSimulare` needs a matching entry in that hook's own `useMemo` dependency array, or the fix regresses silently. `react-hooks/exhaustive-deps` (see below) catches a missing dependency but not a memo that's pointless because its inputs are never stable — that part has to be checked by eye, or by measuring, as it was here: instrumenting `addEventListener`/`removeEventListener` for 13 seconds is what showed a related plan claim — that a `Grile` keyboard listener was re-subscribing every second — didn't actually reproduce, since `AppProvider`'s clock is gated per-screen and doesn't tick on that screen at all.

### Authentication — `src/state/AuthContext.tsx`

Wraps Supabase Auth: `signIn`, `signUp`, `signOut`, `requestPasswordReset`, `updatePassword`, plus `user`/`profile`/`role`/`loading`/`recovery`, all sourced from `supabase.auth.getSession()` and `onAuthStateChange`, never from client state. `role` reads `profiles.role` (fetched after the user is known) and defaults to `'elev'` while there is no session — there is no client-settable role anymore. This replaced a `useState<Role>('admin')` that started every visitor as admin and flipped with one click on a switcher rendered *inside* the access-denied screen, so a student became an administrator with a single tap; `AdminBlocat` (`src/screens/Admin.tsx`) no longer renders any switcher at all.

`App.tsx` gates on this before rendering anything else: `loading` → a bare themed placeholder (no spinner, no fabricated progress bar), `recovery` → `ResetareParolaFinalizare` (a forced new-password form), no `user` → `Autentificare` (login/register/forgot-password, one component with a `mode` field, not three routes — there is nothing to route to before a session exists). Only past that gate does the normal `Sidebar`/`Topbar`/`Content` shell mount.

**`recovery` is how the reset-password link is detected**, not a URL path. Supabase's reset email signs the user into a temporary session and fires `onAuthStateChange('PASSWORD_RECOVERY', …)`; the context sets `recovery = true` on that event and clears it once `updatePassword` succeeds. This coexists with the app's own hash router because supabase-js consumes the `#access_token=…&type=recovery` fragment itself on load, before the router's own `hashchange` handling ever sees a screen name in it.

**Supabase's auth errors are English; the UI is Romanian.** `mesajEroare()` in `AuthContext.tsx` translates the handful that actually surface in the UI (bad credentials, unconfirmed email, duplicate signup, weak password, rate limiting) and falls back to a generic message for anything else — extend that map rather than let raw Supabase text leak into a Romanian screen.

Provider order in `main.tsx` matters: `ErrorBoundary > ToastProvider > AuthProvider > AppProvider > App`. `AuthProvider` sits above `AppProvider` because `Sidebar`/`Admin` need both `useApp()` (navigation) and `useAuth()` (role) at once — but `AppProvider` itself never calls `useAuth()`, which is what keeps `AppState.test.tsx` able to render `<AppProvider>` alone with no `<AuthProvider>` ancestor and no network access.

### The public route space — `landing` is deliberately not a `Screen`

Anonymous visitors used to get the 400px login card and nothing else; there was no public page at all. There is now a marketing page at `#/`, and it lives in a **second route union that does not intersect `Screen`**:

- `SCREENS` / `Screen` — the authenticated shell's routes, consumed by `BUILT_SCREENS`, `Content()`, `Sidebar`, `MobileNav` and `go()`. Unchanged.
- `PUBLIC_ROUTES` / `PublicView` (`'landing' | 'autentificare' | 'inregistrare' | 'parola-uitata'`) — what a visitor without a session can see, resolved by the pure `publicViewFor()` and watched by `usePublicView()`.

Putting `'landing'` in `SCREENS` would make `go('landing')` callable from every component inside the shell, and the two spaces need opposite fallbacks anyway (unknown hash → `acasa` there, → `landing` here). Keeping them disjoint makes "a logged-in user never sees the landing" a **type error** rather than a convention. `router.test.ts` asserts the two never overlap.

`publicViewFor` sends any valid `Screen` to `autentificare` **without touching the hash**, so `#/grile` shared by a friend lands on login and, once the session exists, `readHash()` finds `grile` on its own — there is no post-login redirect logic anywhere, and there should not be. Conversely no `PublicRoute` is a `Screen`, so after login the hash falls back to `acasa` by itself; `App` only rewrites the address bar with `history.replaceState` so it stops lying.

`signOut()` and `stergeContul()` in `AuthContext` reset the hash to `/` *before* dropping the session. Without that, signing out from `#/setari` resolves to `autentificare` and dumps you on the login form instead of the landing page.

### The landing page — `src/screens/Landing/`

Two invariants hold the whole thing up, and `Landing.test.ts` pins both on the file contents because neither would fail a render test:

1. **Nothing inside imports `useApp` or `useAuth`.** The page only renders when there is no session, and `go()` targets routes that require one — a `go('acasa')` in there (e.g. by reusing `<Logo />`, which calls it) throws the visitor into the login card on a logo click. That is why `parts/Marca.tsx` renders the `<img>` directly, as `Autentificare.tsx` already does. Navigation goes through `parts/CtaAuth.tsx`, the only file that knows the public routes.
2. **Nothing outside the directory imports from it.** `App.tsx` loads it with `lazy` + a `LandingBoundary` that falls back to `<Autentificare />` when the chunk 404s (stale `index.html` on Pages after a deploy). One static import from anywhere would merge the whole chunk — page, styles, mockups — back into the main bundle that authenticated students download. It is currently ~8.5 KB + 6 KB gzip, entirely separate; keep it that way.

It is the one screen with its own palette: `--lp-*` tokens on `.lp` in `landing.css`, dark unconditionally, independent of the theme toggle — it is a composition, and a visitor has no theme yet. Same rule as everywhere else though: **no colour is written inline in TSX**, and every class is prefixed `lp-`.

**No animation library was added.** `motion.ts` holds the whole vocabulary — `useInView`, `useReducedMotion`, `useHasPointer`, `usePointerGlow`, `useTilt`, `useParallax`, `useScrollSteps`, `useContorAnimat` — and everything animates only `transform`/`opacity`. Pointer effects write CSS custom properties from a `requestAnimationFrame`, never through `setState`; blur is always static, never animated. `useInView` defaults to `threshold: 0` on purpose: the large panels are taller than the viewport, so a percentage threshold would fire only after they were half past.

The global `prefers-reduced-motion` block in `styles.css` only kills `.screen`/`.logo`, so `landing.css` carries its own — **every new `@keyframes` here must be added to it**, and the hooks short-circuit themselves as well.

**The honesty rule applies hardest here.** A landing page is exactly where "1000+ grile" and student counts want to appear. Every figure shown is derived: days from `EXAM_DATE`, chapters and past sessions counted from `MATERII`, per-chapter counts from `chapterQuestionCount()`. The bank's size is deliberately *not* used as a selling point, and only shipped features are promoted. **`plan` is the only screen still `InLucru`** — `statistici`, `recapitulare` and `notite` all ship now, so the landing copy is free to name them, and a promise of anything else is a bug. The interactive question in the mockup is a real one out of `QUESTIONS`, with its real explanation. Counted nouns still go through `numar()`: "1 grilă", not "1 grile".

### Two independent quiz engines (different persistence semantics)

- **`useSession`** (`src/state/useSession.ts`) — the free practice session. Purely in-memory (lost on reload, results included). Navigation is clamped at both ends, so the last question stays last. Once a question is revealed the answer is locked; `primary()` implements Enter = "check, then advance if already checked, then *finish* on the last question". A session has two phases, derived from `finishedAt` and exposed as `finished`: `Grile.tsx` renders `GrileRun` while it is false and the `GrileRezultat` score panel once true. `finish()` is idempotent (it freezes `durataMs`) and `restart()` clears everything including `startedAt`. Two aggregates, deliberately different: `tally` counts only *revealed* questions (the in-run legend), while `score` counts every *answered* one and reports `pct` against `total`, so unanswered questions count against you.

- **`useSimulare`** (`src/state/useSimulare.ts`) — the timed exam simulation. Persisted to `localStorage` as a `SimRun`. The countdown is **derived from an absolute `endsAt` timestamp** (`endsAt - now`), never decremented by a tick — this is deliberate, so time keeps running while the tab is closed. Preserve this design when editing: storing a "seconds remaining" counter would break the closed-tab guarantee.

  `phase` is derived, never stored: `!run ? 'config' : finishedAt !== null ? 'rezultat' : 'rulare'`. The effective `finishedAt` is `run.finishedAt ?? (expired ? run.endsAt : null)`, so **expiry ends the paper without losing it** and produces the same result after a reload. `finish()` records the submission time and is idempotent — it must never null the run, which is what used to delete the whole exam on "Predă lucrarea"; `reset()` is the one that discards it and returns to config. Scoring (`scoreOf`) is a pure function over `order`, and `answers`/`marks` are keyed by **position in `order`**, not by bank index — unlike `useSession`, which keys by bank index.

The simulation clock only ticks while its screen is open — `AppState.tsx` passes `useNow(screen === 'simulari')`.

**A session is scoped to chapters, and the scope lives in `useSession`, not in the bank it is given.** The hook takes the *whole* library and narrows it itself through the pure `filtreazaCapitole()`; `session.capitole` is the chosen scope and an **empty list means the whole library** — the same convention as the `sessions.chapter_ids` column it is written to, so there is only one meaning for empty. `start(capitole)` opens a new session over a scope, `restart()` reopens the same scope, and `syncFinishedSession` writes `session.capitole` (it used to hardcode `[]`, so a chapter session was indistinguishable from a full-library one).

The consequence to watch: **`session.banca` is the narrowed pool, so nothing that counts the library may read it.** `useApp().questions` is the full one, and that is what `Acasa` reports as the library size and what `GrileConfig` counts per chapter — with the session's own pool there, starting a session on one chapter emptied every other chapter in the list and disabled its button. The two are named differently on purpose: they are both `Question[]` and sit one destructuring line apart, so a shared name made that miscount compile.

**`PoartaContinut` gates on the library, never on the session.** The gate is shared with `Simulari`, so a session-shaped condition in it reaches a screen that has nothing to do with practice sessions — a chapter session left without questions would have blocked an exam in progress. An empty *scope* is `Grile`'s own state (`CapitolGol`), an empty *library* is the gate's.

`QUESTIONS` contains only ~6 entries, so `buildOrder()` repeats the bank to reach the configured question count.

### Progress — `src/state/ProgressContext.tsx`, `src/state/progressState.ts` and `src/lib/progres.ts`

Progress is read from Supabase's immutable `attempts` journal; it is never stored as a `pct` or `done` field. `ProgressProvider` mounts under `AuthProvider`, loads only for an authenticated user, and exposes the raw rows plus loading/error/reload. The context and hook live separately in `progressState.ts`, keeping the provider file a component-only Fast Refresh boundary. It keys the visible rows to the current user id so switching accounts cannot render the previous account's progress for even one frame.

`calculeazaProgres()` is the pure derivation layer. It produces overall correctness, per-chapter coverage/correctness, and one score point per completed session or simulation. Repeated answers increase the answer count but only increase `grileIncercate` once. A response whose question is no longer in the visible runtime library still counts globally and in its run score, but is not guessed into a chapter. `Acasa`, `Statistici` and the per-chapter panel in `Grile` all consume this same result. `AttemptSync` calls `reload()` only after the retry-safe write succeeds, so a finished practice session appears without a page refresh.

Real scores may range from 0 to 100. `ScoreChart` therefore uses a zero-based axis; do not restore the old minimum of 45, which came from the fabricated demo series and renders authentic low scores outside the SVG.

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

Typed constants. `chapters.ts` (`MATERII` keyed by `MaterieId`), `questions.ts` (`QUESTIONS`, `OptionKey`), `profile.ts` (account/exam constants). `EXAM_DATE` in `profile.ts` drives every countdown via `daysUntil()` in `src/lib/time.ts` — dates are computed, never hardcoded in screens.

**`QUESTIONS` is no longer the runtime truth.** Since Faza 4 the question bank is read from Supabase (`src/lib/continut.ts` → `src/state/ContentContext.tsx`), so **adding a question to `questions.ts` does not make it appear in the app** — it appears in `seed.sql` for a fresh project, and in tests as a fixture. Real content is written from Admin, which calls the `salveaza_grila` RPC. The file stays because `npm run seed` generates from it and because the Landing page needs a question it can render with no session.

**Chapters used to be a compiled constant, and that broke in production.** `MATERII` was typed `MaterieId = 'bio' | 'chim'` with 22 chapters while the live database had **three subjects and 30 chapters** — a third subject `ant` plus 8 exam-paper chapters the code did not know about. Nothing signalled: `chapterLabelById` fell back to the raw id, so those chapters rendered as `ant-2026-mg`, and `numaraGrile` could not attribute their questions to any subject.

**Taxonomy is now read from the database and travels as a value, not an import** — the same inversion the question bank already uses. `incarcaTaxonomie()` (in `continut.ts`) builds a `Taxonomie` through the pure `construiesteTaxonomie()` in `lib/taxonomie.ts`; `ContentContext` holds it and `AppProvider` takes it as a prop. Every pure function that needs chapter labels takes it as a parameter (`calculeazaProgres`, `descriereScop`, `capitoleCuNotita`, `valideaza`, `numaraGrile`, `buildOrder`, `questionMaterie`/`questionCap`), defaulting to `TAXONOMIE_GOALA` so a caller that forgets degrades to raw ids rather than crashing.

Three constraints to preserve:

- **`lib/taxonomie.ts` must stay pure.** `scripts/genereaza-seed.mjs` imports it through esbuild with `platform: 'neutral'`; an `import('./supabase')` there — even dynamic — pulls the whole client into the bundle and breaks `npm run seed`. The fetch lives in `continut.ts` for exactly this reason.
- **`src/data/taxonomieSeed.ts` is not runtime truth.** It seeds a fresh project and serves as the test fixture (`TAXONOMIE_SEED`). Importing it from a file that runs in the browser recreates the drift this replaced. The one deliberate exception is `lib/migrations.ts`, which maps *historical* note keys and must run before first render — a moving label map would repair something different every day.
- **The landing page reads it too.** Migration 0009 grants `anon` select on published `materii`/`chapters`/`centre_admitere`, which is what let the compiled constant go. `Landing.tsx` reads `useContentOptional()` and passes the taxonomy down as props; that does not violate the isolation rule, which bans `useApp`/`useAuth` because they carry `go()`, not because they carry data.

A `capId` with no row in the database still renders its raw id rather than vanishing — visible and fixable instead of silent.

The bank flows in as a **parameter, not an import**: `AppProvider` takes `questions` as a prop and passes it to `useSession`/`useSimulare`, which is what keeps `AppState.test.tsx` able to mount the provider alone with no network. `numaraGrile()` in `continut.ts` replaces the old module-level count maps, since a bank that changes at runtime cannot be counted once at import time.

### Administrarea, la scară

Administrarea are acum secțiuni, citite din **al doilea segment de hash** (`#/admin/colectii`). Secțiunile nu intră în `SCREENS`: nu sunt ecrane ale aplicației, nu apar în `Sidebar` sau `MobileNav`, iar `go()` n-are ce face cu ele. Ecranul se citește din primul segment — altfel `admin/colectii` n-ar fi niciun `Screen` și ar cădea tăcut pe `acasa`.

**Lista de grile se interoghează pe server**, nu se filtrează în client: căutare, stare, capitol, colecție, tip, plus paginare și contoare cu `head: true`. Fără RPC nou — PostgREST le face pe toate, iar `questions_citire` distinge deja elevul de administrator, deci o funcție `security definer` ar fi trebuit să reimplementeze regula aia singură.

**Tiparul de căutare are două scăpări suprapuse** (`pentruIlike`), și amândouă sunt necesare: `%`/`_` sunt metacaractere `ilike` — o căutare după „50%" ar întoarce toată biblioteca — iar valoarea se pune între ghilimele fiindcă într-un `or=(...)` **virgula desparte termenii**, deci „1, 2, 3" (chiar textul variantelor unui complement grupat) primea 400.

**Scrierile de structură trec prin RPC** (`salveaza_materie`, `salveaza_capitol`, `salveaza_colectie`), deși politicile ar permite scrierea directă. Motivul e că **id-ul e identitate**: `chapter_id` e scris în `questions`, în `sessions.chapter_ids` și în cheia notițelor, deci un capitol cu grile nu se mai poate muta în altă materie — regula stă lângă date, nu în formular.

**Nu există ștergere de taxonomie sau colecții**, deliberat: depublicarea scoate din fața elevului fără să atingă nimic din ce s-a scris, exact ca retragerea unei grile față de ștergerea ei.

**În `salveaza_materie`/`salveaza_capitol`/`salveaza_colectie`, o cheie absentă înseamnă „las-o cum e".** Prima versiune făcea `coalesce(payload ->> 'x', <implicit>)`, adică absent = pune implicitul — pe dos față de ce spune un formular de redenumire, care trimite doar ce a schimbat omul. `Materie`, `Chapter` și `Colectie` consumă `position` la sortare și n-o mai poartă pe obiect, deci formularul chiar **nu are** ce trimite: rezultatul era că orice corectare de titlu muta rândul în capul listei (toate trei se citesc `order by position`), iar redenumirea unei colecții îi ștergea anul și cartea. Poziția unui rând nou se calculează în bază (`max + 1`), nu se numără în client — `lista.length` greșește de îndată ce pozițiile au goluri. `an`, `centruId` și `sursaBibliografica` se citesc cu `jsonb_exists`, fiindcă pentru ele un `null` trimis explicit chiar înseamnă ceva, iar `coalesce` nu poate distinge asta de o cheie lipsă.

`acoperire_capitole` e `security invoker` — RLS decide ce se numără, deci un elev n-ar vedea ciornele nici ca cifră. Operațiile în masă (`schimba_starea_grilelor`, `atribuie_colectia`) sunt `security definer` fiindcă poarta e rolul, deci intră în allowlist-ul din `rls.test.ts`.

### Writing content — the form and the batch

Admin has two modes over the same library, both reaching the database through the one `salveaza_grila` RPC: the single-question form (`Admin.tsx`, state in `adminCiorna.ts`) and the bulk JSON import (`ImportGrile.tsx`, logic in `importLot.ts`). The paired naming is the convention — PascalCase `.tsx` for the component, camelCase `.ts` for the pure logic beside it. Keep the two names more than a capital letter apart: `ImportGrile.tsx` next to an `importGrile.ts` is a hard `tsc` error on Windows ("differs only in casing"), not a style question.

**The import validates through `valideaza()` — the form's own function — not a parallel rule set.** This is the point of the file, not an implementation detail: a second copy of the rules would drift the first time a rule is added to one side, and the import would start accepting what the form rejects. Only the checks that *cannot* exist in a form live in `importLot.ts`: broken JSON, a `tip` outside the two, an option letter past E, an id repeated inside the same batch. Everything about content itself belongs in `valideaza()`, and the database stays the real gate either way.

**Colecția e entitate, nu text liber.** Migrarea 0008 a pus `questions.colectie` ca text — răspunsul corect atunci, fiindcă nu se știa ce forme ia. Text liber nu se poate însă filtra, nu se poate renumi fără un `update` peste tot, și n-are unde să-și țină anul sau cartea. Migrarea 0011 l-a mutat la `colectii` (`colectie_id` pe grilă), cât timp erau zero grile care îl foloseau.

**Lucrările de admitere s-au mutat aici din capitole.** Baza avea materia `ant` („Subiecte anterioare") cu 8 „capitole" care erau de fapt lucrări (`ant-2026-mg`, `ant-2026-simulare`), cu `nr` ținând anul. Modelul contrazicea decizia scrisă chiar în `data/questions.ts`: o grilă dintr-un subiect oficial ține în continuare de un capitol **real** de conținut, ca să poată fi filtrată și pe materie, și pe proveniență. O lucrare nu e un capitol, e o colecție. Conversia s-a făcut cât era gratis — zero grile, zero notițe, zero sesiuni care să le pomenească.

`salveaza_grila` refuză acum o colecție care nu există: pe text liber, o greșeală de tipar crea tăcut un lot fantomă, invizibil în orice filtru.

**Trei câmpuri spun de unde vine o grilă, și nu sunt interschimbabile.** `sursa` e
felul materialului — o listă închisă (`materie`, `subiect_oficial`, `culegere`)
verificată și de `salveaza_grila`, cu etichetele în `SURSE` din `data/questions.ts`,
una singură fiindcă o citesc formularul, importul și validarea lotului. `colectie_id`
e lotul, o cheie către `colectii`. `src` e
citarea de pagină („Celula, p. 11") și era deja acolo — cele 181 de grile scrise îl
folosesc așa, una per câteva grile, deci nu putea fi refolosit ca proveniență fără
să le piardă. Colecția e nivelul după care se grupează un import întreg.

**Sursa și colecția se aleg o dată pentru tot lotul, în ecranul de import, și cad
peste rândurile care nu le spun.** Regula de precedență e rândul-bate-lotul, și nu
e o preferință: `catreJson` scrie `sursa` și `colectie` pe fiecare grilă exportată,
deci fără ea un export al unei biblioteci mixte ar ieși dintr-un dus-întors cu
totul aceeași sursă. `importLot.test.ts` pinează ambele sensuri.

**One RPC call per question, sequential, deliberately not a batch RPC.** `salveaza_grila` upserts on `id`, so re-pasting a corrected batch is safe and re-running one changes nothing. A batch of fifty with three bad rows therefore saves forty-seven and names the three, which is what you want while authoring — a single transaction would roll back all fifty over one typo. It also means no new migration, so the import needs nothing run by hand in the SQL editor.

The JSON shape is exactly the `questions.ts` entry shape (`opts` as `[key, text]` pairs, `why` as a map), so `catreJson()` round-trips: export the library, fix it in an editor, paste it back. `importLot.test.ts` pins that round trip. Two friendlier `opts` spellings are accepted on the way in (`{ "A": "text" }`, and `[{ key, text, why }]`) because they are predictable things to write, not out of generosity — but the canonical form is what export emits.

**No displayed number may be hand-written.** The data files used to carry a full fictional student — a 22-day streak, "1 407 grile rezolvate", per-chapter `done`/`pct`, ten months of score history, an exam history of papers never sat, an admin queue of 37 pending questions. None of it was computed, so none of it moved when you actually answered a question. It is gone, and the rule that replaced it is: **if a figure cannot be derived from what the student did or from the bank itself, the screen shows an empty state instead** (`src/components/EmptyState.tsx`, which says what to do to make data appear).

Concretely: `Chapter` carries no `total` — `chapterQuestionCount()` / `materieQuestionCount()` in `questions.ts` count the real bank, so the figure grows only as content is written and a chapter with nothing in it disables its own "Exersează" button. `ScoreChart` and `ChapterChart` take their data as props and render an empty state when there is none, rather than owning fabricated constants. When adding a screen, derive or omit — do not seed plausible-looking demo values, and do not restore a `pct` field to make a chart look fuller.

Counted figures still need Romanian grammar: `numar()` in `src/lib/text.ts` handles the `de` rule ("6 grile" but "20 de grile"). Use it instead of interpolating a bare number next to a noun.

**Agreement has shipped broken five times, always the same shape** — a word left plural beside a numeral of one: "1 grilă scrise", "1 grilă publicate", "1 rescriu o grilă existentă", "1 din 1 grile corecte" on the results panel. That last one had sat there since the panel was written and only became obvious once a session could be one question long; a phrase that reads fine at six is not evidence, and the count that exposes it usually arrives later. Two rules follow from that. First, every word that must agree goes *inside* `numar()`'s arguments, adjectives included — `numar(n, 'grilă scrisă', 'grile scrise')`, never `` `${numar(n, 'grilă', 'grile')} scrise` ``. Second, when the number is rendered separately (a styled `<span>`, with the rest of the phrase following in JSX), `numar()` cannot reach the phrase at all: give that phrase its own pure function and test it at 1, 2 and 20, the way `frazaRescrieri` in `importLot.ts` and `frazaCorecte` in `grileText.ts` do. Every one of these was found by looking at the screen, never by the suite — and once a render test was written *against the broken wording*, pinning the bug instead of the fix.

### Feedback for actions — `src/state/ToastContext.tsx`

The counterpart to `EmptyState`: `EmptyState` says a screen has nothing yet, `useToast().notify(kind, message)` says an action just succeeded or failed. Before this there was no such mechanism anywhere in the app — a save with no visible result and a save that silently failed looked identical. `ToastProvider` is mounted in `main.tsx` outside `AppProvider`, since transient notifications don't belong in state that also holds session and exam data.

It is wired now — roughly twenty `notify()` calls across Admin, ImportGrile, Autentificare, ResetareParolaFinalizare and Setari.

**Reach for it instead of inventing a fourth mechanism.** There are already four ways a failure reaches the user, with no rule choosing between them: toasts, local inline error state (`Autentificare` uses *both* — inline for sign-in failure, toast for success), `EmptyState` with a retry action, and a bespoke fixed-position alert card in `AttemptSync.tsx` that reimplements the toast container at a higher `z-index`. Prefer `notify()`; converging the rest is a worthwhile cleanup, not a reason to add a fifth.

Separately, **`reportError` from `src/lib/sentry.ts` has exactly one caller** (`ErrorBoundary.componentDidCatch`), so Sentry sees render crashes and nothing else — every failed save, RLS rejection and dropped sync is invisible in production. It is documented as safe to call unconditionally, so adding it to a `catch` block costs one line.

**Formatul unei grile e o linie în `question_types`, nu o valoare de enum.** `simplu` și `grupat` sunt rânduri; un format nou e un `insert`, nu un `alter type` plus patru ramuri de cod. Tipul poartă regulile: câte variante acceptă, câte afirmații cere, dacă variantele pot fi amestecate, și cum se randează (`hint_randare`, vocabular mic, cu `lista` drept cădere pentru un tip necunoscut — sărac, nu gol).

`QuestionType` e acum `string`, deliberat: uniunea compilată e exact tiparul care a produs divergența `MaterieId`. Aceleași trei reguli ca la taxonomie — modulul `lib/tipuriGrile.ts` rămâne pur (citirea e în `continut.ts`, altfel `npm run seed` cade), `data/tipuriSeed.ts` e fixtură de test, iar valoarea circulă prin `ContentContext` → `AppProvider`.

Două lucruri specifice tipurilor:

- **`sablon_optiuni` înseamnă „textele variantelor sunt fixe și poziționale".** La complementul grupat A = „1, 2, 3", B = „1, 3", C = „2, 4", D = „doar 4", E = „toate" — toate cele 110 grile grupate le au identice. Nu sunt conținut, sunt cheia formatului, așa că `salveaza_grila` refuză o grilă grupată cu alte texte.
- **`permite_amestecare` e fals implicit și stă pe tip, nu pe grilă.** Un CHECK (`qt_sablon_fix`) face imposibil un tip cu șablon fix *și* amestecare permisă: siguranța la amestecarea variantelor e constrângere, nu convenție. Un format pozițional adăugat de cineva care nu s-a gândit la asta e corect din oficiu.

`tipuriSeed.ts` oglindește inserarea din migrarea 0010, deci pot diverge — `schema.test.ts` compară fixtura cu ce a intrat efectiv în bază, ca diferența să pice acolo, nu într-un formular care refuză o grilă corectă.

**Questions have a stable `id`** (`QuestionId`, e.g. `bio-nervos-01`), and anything persisted or passed around must reference that id — never the array position. `QUESTION_BY_ID` / `questionById()` resolve it and `isQuestionId()` validates it. This is why `SimRun.order` stores ids: with positions, inserting one question into the middle of the bank silently rewrote the content of every saved paper. `QUESTION_BY_ID` is built at the bottom of the file, after `QUESTIONS` — building it earlier is a temporal-dead-zone crash at import time. Ids must be unique; a duplicate throws on module load rather than making a question unreachable.

**Chapters have the same treatment** (`ChapterId`, e.g. `bio-nervos`), for two reasons `nr` could not cover: under "Subiecte anterioare" `nr` is a *year* and 2026 holds two sessions, so `nr` repeats; and the note key used to embed the chapter *label* (`medbuc.note.03. Sistemul nervos`), so fixing a typo in a title orphaned the student's note. `CHAPTER_BY_ID` / `chapterById()` / `isChapterId()` mirror the question helpers and are likewise built after `MATERII`. Every `Chapter` also carries its `materie`, so a chapter id alone resolves to both the label (`chapterLabelById`) and the subject name (`materieNameOf`).

**A question stores only `capId`** — its subject and chapter label are derived through `questionMaterie()` / `questionCap()` rather than duplicated as free text, which is what let a question claim a chapter that did not exist.

Renaming a persisted key means the old one must be moved, not abandoned: `src/lib/migrations.ts` runs once from `main.tsx`, before the first render. `noteKeyMoves()` is the pure part and is tested; it never overwrites a newer note and leaves unrecognised keys alone rather than deleting someone's text.

### Database schema — `supabase/`

This is live — the app reads and writes it. The schema was written first, in SQL, so the model would be designed rather than translated from TypeScript types later. `supabase/README.md` carries the design decisions; the ones that constrain future work:

- **Content ids are human-written `text`** (`bio-nervos`, `bio-nervos-01`), not `uuid` — they are already the app's identity and are embedded in saved exam papers, so a simulation started before the migration stays valid after it.
- **`attempts` is a journal, not state.** One row per answer, the single source for progress, statistics and spaced repetition. Nothing stores a denormalised `pct` or `done` — that is exactly how the fabricated figures appeared. There are deliberately no `update`/`delete` policies on it.
- **`seed.sql` is generated** by `npm run seed` from `src/data/` and must never be hand-edited. Regenerate it after changing chapters or questions.

`schema.test.ts` and `rls.test.ts` run the migrations on a real Postgres in-process (PGlite, Postgres 18 in WebAssembly) rather than asserting on the SQL text. This matters most for RLS: **a wrong policy raises no error, it just shows someone else's data.** Every query in those tests goes through the `authenticated` role with a user id set on the request, the way a browser query arrives — `harness.ts` builds the Supabase-provided pieces the migrations depend on (`auth` schema, `auth.uid()`, the `anon`/`authenticated` roles). When adding a policy, add the test that fails without it; weakening `notes_proprii` to `using (true)` must break the isolation tests.

Note the harness detail that already bit once: it uses session-level `set role`, not `set local role`. Outside a transaction `set local` is silently ignored, queries keep running as the table owner, RLS is bypassed, and every isolation test passes while proving nothing.

**Two tests in `rls.test.ts` cover the tables nobody has written yet:** every table in `public` must have RLS enabled, and must have at least one policy. Supabase grants `anon`/`authenticated` `select/insert/update/delete` on every new table in `public` by default, so a forgotten `enable row level security` publishes the whole table with no error anywhere — the per-table tests below them only protect tables someone remembered. The second test catches the opposite slip: RLS on with no policy refuses everything, which is safe but looks like a broken table.

### `test_runs` / `test_run_items` — one table for every kind of test

`sessions` (practice), `sim_runs` (exam) and recapitulare (which reuses `sessions` because it has nowhere else to go) are three storage shapes for one idea. `test_runs` holds all of them with `mod` as a column. **Migration 0016 moves nothing** — the old tables keep their rows and the deployed client keeps writing to them; the backfill and the client switch are a separate slice, so a started exam can't be lost by a rollback.

Three things there that are load-bearing:

- **`test_run_items.question_id` has no foreign key, deliberately.** The snapshot must survive a deleted question — `sim_runs.question_ids` already works this way and `GrilaLipsa` already renders the missing case without renumbering. An FK would turn a library deletion into a corrupted paper, or worse, one with answers shifted onto other questions.
- **Positions are explicit rows, so holes stay holes.** Answers are position-keyed everywhere (`attempts.client_key = '<run>:<position>'`), so any compaction silently rewrites what the student answered — exactly the `useRecapitulare` `flatMap` bug. Numbered rows make that class of mistake impossible rather than merely avoided by convention.
- **The snapshot is frozen by a trigger, not by RLS.** A `with check` clause only sees the new row, so it cannot say "this column may not change"; `private.ingheata_instantaneul` sees `old` and `new`, refuses any change to `question_id`/`position`/`option_order`, and freezes `chosen`/`marked` once the run's `finished_at` is set.

`test_run_items` has **no delete policy** — a paper is discarded whole (cascade from `test_runs`), never row by row, because removing a middle position renumbers everything after it. And there is no `scor` column, and there must not be: a stored score is a score that can disagree with the journal.

### Two derived columns that are not state

- **`questions.materie_id` is denormalised from `chapter_id`** and kept there by two triggers (`private.completeaza_materia` on questions, `private.propaga_materia` on chapters). It exists because quota selection partitions by subject and the wizard counts per subject constantly — through a join, no index can cover that access path. It is derived at write time, so a client cannot claim a subject its chapter does not have, and `schema.test.ts` asserts it never diverges. This is not a violation of "derive, never store": the rule is about *displayed figures* that can drift from the journal, and this one is structurally pinned to its source.
- **`nivel_acces` / `questions.acces` / `colectii.acces` / `profiles.abonament_pana` are the entitlement seam, and nothing is gated.** Everything defaults to `liber` and `private.are_acces()` returns true for everybody. The point is that turning it on later is a data change plus one predicate in a `where`, not a rewrite of the generation engine. When it does get used, the predicate belongs in the candidate query's `where` — an ineligible question must not be a row, not a hidden row.

## TypeScript constraints that bite

`tsconfig.json` is aggressive; these cause build failures that may be surprising:

- **`noUncheckedIndexedAccess`** — array/record indexing yields `T | undefined`. Existing code uses `!` or `??` fallbacks after indexing (e.g. `QUESTIONS[index] ?? QUESTIONS[0]!`). Follow that pattern.
- **`verbatimModuleSyntax`** — type-only imports must use `import type { ... }` (or inline `type` specifiers, as in `import { QUESTIONS, type Question }`).
- **`noUnusedLocals` / `noUnusedParameters`** — an unused variable fails the build, not just lints.

## Contributing conventions

- **Work through a pull request**, never straight onto `master`. Every commit in the history arrived that way, squash-merged.
- **Commit messages and PR bodies are Romanian**, like the rest of the project, and explain *why* — the shape of the bug, not just the change. Recent history is the reference.
- **Do not add `Co-Authored-By` trailers**, and do not append "Generated with…" footers to PR bodies. The repository owner asked for these to stay out and the existing history was rewritten to remove them.

## If you see an `AGENTS.md`

It is **untracked and local** — not part of the repository, so a fresh clone will not have one. Where it exists it is byte-identical to this file apart from the title and the tool it names, kept for an agent that reads that filename. Nothing generates it, so editing this file leaves that copy stale; update both, or delete it.

## Deployment

Pushing to `master` triggers `.github/workflows/deploy.yml`, which builds and publishes `dist/` to GitHub Pages: https://mancilamr28.github.io/medbuc/

`vite.config.ts` sets `base: '/medbuc/'` because the site is served from a repo subpath. If the repo is renamed or moved to a custom domain, that `base` must change or all asset URLs 404.

## Known placeholder

`public/logo-kitty.svg` is a stand-in mark. The intended PNG was never downloaded; to swap it, drop the file in `public/` and update the path in `src/components/Logo.tsx`.
