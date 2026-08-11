# Repository Guidelines

## Project Structure & Module Organization

MedBuc is a React 19, TypeScript, and Vite single-page application. Application code is under `src/`: reusable UI in `components/`, route-level views in `screens/`, shared state and quiz logic in `state/`, typed static content in `data/`, and routing/hooks/style helpers in `lib/`. Global design tokens and interactive CSS live in `src/styles.css`. Keep `design/MedBuc.dc.html` as a visual reference, and place publicly served assets in `public/`. Production output in `dist/` is generated and should not be edited.

## Build, Test, and Development Commands

```bash
npm install        # install dependencies
npm run dev        # start Vite at http://localhost:5173
npm run typecheck  # run TypeScript checks without output
npm run build      # typecheck, then create dist/ production bundle
npm run preview    # serve the generated production bundle
```

There is no test runner or linter configured. Run `npm run build` before submitting changes; it is the project’s required verification gate.

## Coding Style & Naming Conventions

Use TypeScript and functional React components with two-space indentation, single quotes, semicolons, and trailing commas, matching existing files. Use PascalCase for components (`ScoreChart.tsx`), camelCase for functions and hooks (`useSimulare.ts`), and Romanian domain identifiers and UI text (`materie`, `capitol`, `setari`). Import types with `import type` where applicable.

Respect strict TypeScript: indexed values may be undefined, and unused locals fail builds. Use CSS classes for interactive states and `src/lib/ui.ts` helpers for layout/typography. Reference CSS variables such as `var(--brand)` rather than hardcoded colors so both themes work.

## Architecture & State

Routes are hash-based and defined in `src/lib/router.ts`. A new implemented screen needs a route entry, `BUILT_SCREENS` entry, a `Content()` case in `src/App.tsx`, and navigation entries for desktop and mobile. Shared application state belongs in `AppState`; persist local preferences only through `usePersistentState`, using `medbuc.*` keys. Static content belongs in `src/data/`.

## Commit & Pull Request Guidelines

History currently uses short imperative subjects (for example, `Add GitHub Pages deployment via Actions`). Keep commits focused and similarly phrased. Pull requests should state the user-facing change, list validation performed (normally `npm run build`), link relevant issues, and include screenshots for visible UI or responsive-layout changes. Do not commit generated `dist/` output or credentials.
