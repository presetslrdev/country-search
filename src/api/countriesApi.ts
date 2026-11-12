import { HttpError } from '../errors/httpError.js';
import type { RawCountry } from '../types/country.js';

const COUNTRIES_API_BASE = 'https://countries.dev/name';
export const DEFAULT_REQUEST_TIMEOUT_MS = 8000;

function composeAbortSignal(
  callerSignal: AbortSignal | undefined,
  timeoutMs: number,
): AbortSignal {
  const timeoutSignal = AbortSignal.timeout(timeoutMs);

  if (!callerSignal) {
    return timeoutSignal;
  }

  if (typeof AbortSignal.any === 'function') {
    return AbortSignal.any([callerSignal, timeoutSignal]);
  }

  // Fallback for environments without AbortSignal.any
  const controller = new AbortController();
  const onAbort = (source: AbortSignal): void => {
    controller.abort(source.reason);
  };

  if (callerSignal.aborted) {
    onAbort(callerSignal);
  } else if (timeoutSignal.aborted) {
    onAbort(timeoutSignal);
  } else {
    callerSignal.addEventListener('abort', () => onAbort(callerSignal), {
      once: true,
    });
    timeoutSignal.addEventListener('abort', () => onAbort(timeoutSignal), {
      once: true,
    });
  }

  return controller.signal;
}

/**
 * Queries countries.dev by country name with cancellation and timeout support.
 * Returns an empty array on 404; throws HttpError on other non-ok responses.
 */
export async function searchCountries(
  query: string,
  signal?: AbortSignal,
  timeoutMs: number = DEFAULT_REQUEST_TIMEOUT_MS,
): Promise<RawCountry[]> {
  const trimmed = query.trim();
  const encodedQuery = encodeURIComponent(trimmed);
  const combinedSignal = composeAbortSignal(signal, timeoutMs);

  const response = await fetch(`${COUNTRIES_API_BASE}/${encodedQuery}`, {
    signal: combinedSignal,
  });

  if (response.status === 404) {
    return [];
  }

  if (!response.ok) {
    throw new HttpError(
      response.status,
      `Countries API returned ${response.status} ${response.statusText}`.trim(),
    );
  }

  const data = (await response.json()) as RawCountry[];
  return Array.isArray(data) ? data : [];
}
