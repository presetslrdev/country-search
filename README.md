# Country Search

Live country search application built with TypeScript, `AbortController` request cancellation, custom `debounce`, and TDD (Vitest).

## Features

- Live search against [`countries.dev`](https://countries.dev) (`GET https://countries.dev/name/{query}`).
- Immediate cancellation of outdated in-flight requests on every keystroke via `AbortController`.
- Request timeout handling via `AbortSignal.timeout` + `AbortSignal.any` (distinct `TimeoutError` vs `AbortError`).
- Distinct UI states: idle, loading, empty (404), error with Retry (re-sends the last query), and results grid.
- Country detail modal on card click (native name, subregion, area, density, borders, languages, currencies, timezones).
- **Bonus**: In-memory query cache with in-flight request deduplication and independent per-caller `AbortSignal`s.
- **Bonus**: Persistent recent search history in `localStorage` with instant cached replay.

## Scripts

- `npm run build` — compile TypeScript to `dist/` ES modules
- `npm run typecheck` — run `tsc --noEmit`
- `npm test` — run Vitest test suite
- `npm run lint` — run ESLint
- `npm run format` — format files with Prettier

## Documentation

See [DESIGN.md](./DESIGN.md) for cancellation architecture, debounce delay rationale, Big O analysis, and clean code notes.
