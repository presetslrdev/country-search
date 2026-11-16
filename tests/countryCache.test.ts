import { describe, expect, it, vi } from 'vitest';
import { createCachedCountryFetcher } from '../src/api/countryCache.js';
import type { RawCountry } from '../src/types/country.js';

describe('createCachedCountryFetcher', () => {
  it('returns cached results for repeated normalized queries without refetching', async () => {
    const spain: RawCountry[] = [{ name: 'Spain' }];
    const baseFetcher = vi.fn().mockResolvedValue(spain);
    const cachedFetch = createCachedCountryFetcher(baseFetcher);

    const first = await cachedFetch('Spain', new AbortController().signal);
    const second = await cachedFetch('  spain ', new AbortController().signal);

    expect(first).toEqual(spain);
    expect(second).toEqual(spain);
    expect(baseFetcher).toHaveBeenCalledTimes(1);
  });

  it('deduplicates concurrent in-flight requests for the same query', async () => {
    let resolveFetch!: (value: RawCountry[]) => void;
    const baseFetcher = vi.fn(
      () =>
        new Promise<RawCountry[]>((resolve) => {
          resolveFetch = resolve;
        }),
    );
    const cachedFetch = createCachedCountryFetcher(baseFetcher);

    const p1 = cachedFetch('italy', new AbortController().signal);
    const p2 = cachedFetch('ITALY', new AbortController().signal);

    expect(baseFetcher).toHaveBeenCalledTimes(1);

    const payload: RawCountry[] = [{ name: 'Italy' }];
    resolveFetch(payload);

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toEqual(payload);
    expect(r2).toEqual(payload);
  });

  it('does not abort shared in-flight request for other callers when one caller aborts', async () => {
    let resolveFetch!: (value: RawCountry[]) => void;
    let underlyingSignal!: AbortSignal;

    const baseFetcher = vi.fn((_query: string, signal: AbortSignal) => {
      underlyingSignal = signal;
      return new Promise<RawCountry[]>((resolve, reject) => {
        signal.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });
        resolveFetch = resolve;
      });
    });

    const cachedFetch = createCachedCountryFetcher(baseFetcher);

    const controllerA = new AbortController();
    const controllerB = new AbortController();

    const promiseA = cachedFetch('france', controllerA.signal);
    const promiseB = cachedFetch('france', controllerB.signal);

    controllerA.abort(new DOMException('Caller A aborted', 'AbortError'));

    await expect(promiseA).rejects.toMatchObject({ name: 'AbortError' });
    expect(underlyingSignal.aborted).toBe(false);

    const payload: RawCountry[] = [{ name: 'France' }];
    resolveFetch(payload);
    await expect(promiseB).resolves.toEqual(payload);
  });

  it('aborts the underlying request when all callers abort', async () => {
    let underlyingSignal!: AbortSignal;

    const baseFetcher = vi.fn((_query: string, signal: AbortSignal) => {
      underlyingSignal = signal;
      return new Promise<RawCountry[]>((_resolve, reject) => {
        signal.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });
      });
    });

    const cachedFetch = createCachedCountryFetcher(baseFetcher);

    const controllerA = new AbortController();
    const controllerB = new AbortController();

    const promiseA = cachedFetch('portugal', controllerA.signal);
    const promiseB = cachedFetch('portugal', controllerB.signal);

    controllerA.abort();
    expect(underlyingSignal.aborted).toBe(false);

    controllerB.abort();
    expect(underlyingSignal.aborted).toBe(true);

    await expect(promiseA).rejects.toMatchObject({ name: 'AbortError' });
    await expect(promiseB).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('does not cache failed requests so subsequent retries hit the network', async () => {
    const baseFetcher = vi
      .fn()
      .mockRejectedValueOnce(new Error('Network down'))
      .mockResolvedValueOnce([{ name: 'Poland' }]);

    const cachedFetch = createCachedCountryFetcher(baseFetcher);

    await expect(
      cachedFetch('poland', new AbortController().signal),
    ).rejects.toThrow('Network down');

    const result = await cachedFetch('poland', new AbortController().signal);
    expect(result).toEqual([{ name: 'Poland' }]);
    expect(baseFetcher).toHaveBeenCalledTimes(2);
  });
});
