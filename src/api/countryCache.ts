import type { CountryFetcher } from '../services/countrySearchController.js';
import type { RawCountry } from '../types/country.js';

interface InFlightEntry {
  promise: Promise<RawCountry[]>;
  controller: AbortController;
  subscribers: number;
}

function normalizeKey(query: string): string {
  return query.trim().toLowerCase();
}

function createAbortError(signal: AbortSignal): DOMException {
  if (signal.reason instanceof DOMException) {
    return signal.reason;
  }
  return new DOMException('The operation was aborted.', 'AbortError');
}

/**
 * Wraps a CountryFetcher with an in-memory query cache and in-flight
 * request deduplication. Each caller retains independent AbortSignal control.
 */
export function createCachedCountryFetcher(
  baseFetcher: CountryFetcher,
): CountryFetcher {
  const cache = new Map<string, RawCountry[]>();
  const inFlight = new Map<string, InFlightEntry>();

  return (query: string, signal: AbortSignal): Promise<RawCountry[]> => {
    if (signal.aborted) {
      return Promise.reject(createAbortError(signal));
    }

    const key = normalizeKey(query);
    const cached = cache.get(key);
    if (cached !== undefined) {
      return Promise.resolve(cached);
    }

    let entry = inFlight.get(key);
    if (!entry) {
      const controller = new AbortController();
      const promise = baseFetcher(query.trim(), controller.signal)
        .then((result) => {
          cache.set(key, result);
          return result;
        })
        .finally(() => {
          inFlight.delete(key);
        });

      entry = { promise, controller, subscribers: 0 };
      inFlight.set(key, entry);
    }

    const activeEntry = entry;
    activeEntry.subscribers += 1;

    return new Promise<RawCountry[]>((resolve, reject) => {
      let settled = false;

      const onCallerAbort = (): void => {
        if (settled) {
          return;
        }
        settled = true;
        activeEntry.subscribers -= 1;

        if (activeEntry.subscribers <= 0) {
          inFlight.delete(key);
          activeEntry.controller.abort(createAbortError(signal));
        }

        reject(createAbortError(signal));
      };

      signal.addEventListener('abort', onCallerAbort, { once: true });

      activeEntry.promise.then(
        (data) => {
          signal.removeEventListener('abort', onCallerAbort);
          if (!settled) {
            settled = true;
            resolve(data);
          }
        },
        (error: unknown) => {
          signal.removeEventListener('abort', onCallerAbort);
          if (!settled) {
            settled = true;
            reject(error);
          }
        },
      );
    });
  };
}
