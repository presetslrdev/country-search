# Architecture & Design Notes

## 1. Stale Request Cancellation (`AbortController`)

### How It Works

In `CountrySearchController` (`src/services/countrySearchController.ts`), every input change immediately calls `cancelPending()`:

1. Any pending `debounce` timer is cleared via `this.debouncedSearch.cancel()`.
2. Any active network request is immediately aborted via `this.activeController.abort(new DOMException('Superseded by newer search input.', 'AbortError'))`.
3. When a new search actually fires in `executeSearch(query)`, a fresh `AbortController` is created and its `signal` is passed into `searchCountries(query, signal)`.
4. Inside `searchCountries` (`src/api/countriesApi.ts`), the caller's `signal` is composed with `AbortSignal.timeout(8000)` via `AbortSignal.any([callerSignal, timeoutSignal])` (with a manual listener fallback if `AbortSignal.any` is unavailable).
5. In `catch`, `classifySearchError` (`src/errors/errorClassifier.ts`) inspects `error.name`:
   - `AbortError` -> `{ kind: 'aborted' }`: silently ignored; no error state is rendered.
   - `TimeoutError` -> `{ kind: 'timeout', message }`: rendered as an error with a Retry button.
   - `HttpError` (non-404) or network `TypeError` -> rendered as an error with a Retry button.
   - HTTP `404` is handled inside `searchCountries` before throwing and returns `[]`, which transitions the UI to the friendly `empty` state.

### Why `AbortController` Instead of an "Ignore Stale Response" Flag

A naive flag or request-ID counter (e.g., `if (requestId !== latestRequestId) return`) only hides stale responses in the UI after the browser has already downloaded, parsed, and allocated memory for them. Using `AbortController`:

- Cancels the underlying HTTP request at the browser network layer (visible as `canceled` in DevTools Network tab), saving bandwidth and server load.
- Prevents race conditions even during the `debounce` window: if request A is already in flight and the user types a new character, A is aborted _immediately_ on the keystroke rather than waiting 350 ms for the next debounce tick.
- Properly separates user-initiated cancellation (`AbortError`) from genuine failures (`TimeoutError`, `HttpError`, network errors).

## 2. Debounce Delay Rationale (`350 ms`)

`CountrySearchController` uses `DEFAULT_DEBOUNCE_MS = 350` (`src/services/countrySearchController.ts`).

- **If removed (`0 ms`)**: Every single keystroke triggers a network request and an immediate abort on the next keystroke. Typing `"united kingdom"` (14 characters) would fire 14 requests, 13 of which are wasted, causing unnecessary network chatter, UI flickering into loading states, and potential rate-limiting.
- **If too large (e.g., `1200–1500 ms`)**: The search feels sluggish and unresponsive. Users pause for ~200–400 ms between words or after finishing a short query; waiting over a second makes the app feel broken or non-interactive.
- **`350 ms` sweet spot**: Fast typists (~5–7 chars/sec, ~150–200 ms between keystrokes) coalesce an entire word into a single request, while the UI responds almost immediately once the user pauses.

## 3. Complexity Analysis (Big O)

### `mapCountryResponse(raw)` (`src/mappers/countryMapper.ts`)

- **Time Complexity**: $O(B + L + C + T)$, where:
  - $B$ = `raw.borders?.length ?? 0` (shallow copy `[...raw.borders]`)
  - $L$ = `raw.languages?.length ?? 0` (`.map(lang => lang.name)`)
  - $C$ = `raw.currencies?.length ?? 0` (`.map(formatCurrency)`)
  - $T$ = `raw.timezones?.length ?? 0` (shallow copy `[...raw.timezones]`)
  - Let $K = B + L + C + T$ be the total number of nested items in a single country object; the mapper runs in $O(K)$ linear time. For a list of $N$ countries (`rawCountries.map(mapCountryResponse)`), total mapping time is $O(N \cdot K_{\max})$ (practically $O(N)$ since $K$ is small and bounded per country).
- **Space Complexity**: $O(B + L + C + T)$ per country (allocates new arrays so the input object is never mutated).

### Query Cache & In-Flight Deduplication (`src/api/countryCache.ts`)

`createCachedCountryFetcher` maintains two `Map<string, ...>` structures keyed by `query.trim().toLowerCase()`:

- **Cache lookup / insert (`cache.get` / `cache.set`)**: $O(1)$ average time, $O(M)$ space where $M$ is the number of distinct cached queries (each storing its `RawCountry[]` reference).
- **In-flight deduplication (`inFlight.get` / `inFlight.set` / `inFlight.delete`)**: $O(1)$ average time per subscribe/settle/abort event, $O(P)$ space where $P$ is the number of currently active distinct queries.
- **Per-caller cancellation**: Reference-counted via `subscribers` ($O(1)$ increment/decrement). Aborting one caller removes its listener and decrements `subscribers` in $O(1)$ without aborting the shared fetch for other callers; only when `subscribers === 0` is the underlying `AbortController.abort()` invoked.

## 4. Clean Code Principles Applied

- **Single Responsibility Principle (SRP)**:
  - `src/utils/debounce.ts` (`debounce`) — pure timing utility.
  - `src/api/countriesApi.ts` (`searchCountries`) — HTTP transport, timeout composition, and 404 semantics.
  - `src/mappers/countryMapper.ts` (`mapCountryResponse`) — pure data normalization.
  - `src/errors/errorClassifier.ts` (`classifySearchError`) — error taxonomy isolated from UI and fetch.
  - `src/services/countrySearchController.ts` (`CountrySearchController`) — state machine and request lifecycle, completely decoupled from the DOM.
  - `src/ui/*` — presentation and DOM event binding only.
- **Dependency Inversion / Testability**: `CountrySearchController` and `AppView` accept an optional `fetcher: CountryFetcher` (`src/services/countrySearchController.ts`, `src/ui/appView.ts`) and `SearchHistoryStorage` (`src/storage/searchHistory.ts`), allowing unit and integration tests to inject deterministic mocks without touching the network.
- **Immutability & Purity**: `mapCountryResponse` (`src/mappers/countryMapper.ts`) returns new arrays (`[...raw.borders]`, `[...raw.timezones]`) and never mutates API payloads.
- **XSS-Safe DOM Construction**: `src/ui/domHelpers.ts` (`createElement`) and all `src/ui/*` modules use `document.createElement`, `textContent`, and `replaceChildren` exclusively—zero `innerHTML` or `insertAdjacentHTML`.
- **Fail-Safe Storage**: `SearchHistoryStorage` (`src/storage/searchHistory.ts`) wraps `localStorage` access and `JSON.parse` in `try/catch` and validates array elements with a type guard so corrupted data or private-browsing quota limits never crash the app.
