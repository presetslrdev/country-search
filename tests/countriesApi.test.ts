import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { searchCountries } from '../src/api/countriesApi.js';
import { HttpError } from '../src/errors/httpError.js';

describe('searchCountries', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches encoded country query and returns parsed JSON array', async () => {
    const payload = [{ name: 'United Kingdom' }];
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const controller = new AbortController();
    const result = await searchCountries('united kingdom', controller.signal);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://countries.dev/name/united%20kingdom');
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(result).toEqual(payload);
  });

  it('returns an empty array on 404 instead of throwing', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('Country not found', { status: 404 }),
    );

    const result = await searchCountries('atlantis');
    expect(result).toEqual([]);
  });

  it('throws HttpError with status when response.ok is false and status is not 404', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('Internal Server Error', {
        status: 500,
        statusText: 'Internal Server Error',
      }),
    );

    await expect(searchCountries('spain')).rejects.toMatchObject({
      name: 'HttpError',
      status: 500,
    });
  });

  it('throws an instance of HttpError on 503', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('Service Unavailable', { status: 503 }),
    );

    let caught: unknown;
    try {
      await searchCountries('france');
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(HttpError);
    expect((caught as HttpError).status).toBe(503);
  });

  it('propagates AbortError when caller aborts the signal', async () => {
    const controller = new AbortController();
    fetchMock.mockImplementationOnce((_url: string, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        const sig = init?.signal;
        if (sig?.aborted) {
          reject(new DOMException('The operation was aborted.', 'AbortError'));
          return;
        }
        sig?.addEventListener('abort', () => {
          reject(
            sig.reason ??
              new DOMException('The operation was aborted.', 'AbortError'),
          );
        });
      });
    });

    const promise = searchCountries('spain', controller.signal);
    controller.abort(
      new DOMException('The operation was aborted.', 'AbortError'),
    );

    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
  });
});
