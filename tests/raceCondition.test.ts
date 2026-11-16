import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CountrySearchController,
  type SearchState,
} from '../src/services/countrySearchController.js';

interface DeferredResponse {
  resolve: (value: Response) => void;
  reject: (reason?: unknown) => void;
  signal: AbortSignal | undefined;
  aborted: boolean;
}

function createAbortAwareFetchMock() {
  const calls: Array<{ url: string; deferred: DeferredResponse }> = [];

  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    return new Promise<Response>((resolve, reject) => {
      const entry: DeferredResponse = {
        resolve,
        reject,
        signal: init?.signal,
        aborted: false,
      };

      const sig = init?.signal;
      if (sig?.aborted) {
        entry.aborted = true;
        reject(new DOMException('The operation was aborted.', 'AbortError'));
        return;
      }

      sig?.addEventListener(
        'abort',
        () => {
          entry.aborted = true;
          reject(new DOMException('The operation was aborted.', 'AbortError'));
        },
        { once: true },
      );

      calls.push({ url, deferred: entry });
    });
  });

  return { fetchMock, calls };
}

describe('CountrySearchController race condition and cancellation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('aborts earlier in-flight request on new input and keeps only latest results', async () => {
    const { fetchMock, calls } = createAbortAwareFetchMock();
    vi.stubGlobal('fetch', fetchMock);

    const states: SearchState[] = [];
    const controller = new CountrySearchController({
      debounceMs: 300,
      onStateChange: (state) => states.push(state),
    });

    // 1. User types "sp" and debounce fires
    controller.handleInput('sp');
    vi.advanceTimersByTime(300);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toContain('/name/sp');

    // 2. While "sp" is still in-flight, user types "spain"
    // Previous request must be aborted immediately on input change (before debounce)
    controller.handleInput('spain');
    expect(calls[0]?.deferred.aborted).toBe(true);
    expect(calls[0]?.deferred.signal?.aborted).toBe(true);

    // 3. Debounce fires for "spain"
    vi.advanceTimersByTime(300);
    expect(calls).toHaveLength(2);
    expect(calls[1]?.url).toContain('/name/spain');

    // 4. "spain" resolves first
    calls[1]?.deferred.resolve(
      new Response(JSON.stringify([{ name: 'Spain' }]), { status: 200 }),
    );
    for (let i = 0; i < 10; i += 1) {
      await Promise.resolve();
    }

    // 5. Even if "sp" attempts to resolve later, it was already aborted
    calls[0]?.deferred.resolve(
      new Response(JSON.stringify([{ name: 'Singapore' }]), { status: 200 }),
    );
    for (let i = 0; i < 10; i += 1) {
      await Promise.resolve();
    }

    const finalState = states.at(-1);
    expect(finalState?.status).toBe('success');
    if (finalState?.status === 'success') {
      expect(finalState.query).toBe('spain');
      expect(finalState.countries.map((c) => c.name)).toEqual(['Spain']);
    }

    // AbortError must never appear as an error state
    expect(states.some((s) => s.status === 'error')).toBe(false);
  });

  it('cancels in-flight request and resets to idle when input is cleared', async () => {
    const { fetchMock, calls } = createAbortAwareFetchMock();
    vi.stubGlobal('fetch', fetchMock);

    const states: SearchState[] = [];
    const controller = new CountrySearchController({
      debounceMs: 300,
      onStateChange: (state) => states.push(state),
    });

    controller.handleInput('ger');
    vi.advanceTimersByTime(300);
    expect(calls).toHaveLength(1);

    controller.handleInput('   ');
    expect(calls[0]?.deferred.aborted).toBe(true);

    vi.advanceTimersByTime(300);
    expect(calls).toHaveLength(1);
    expect(states.at(-1)).toEqual({ status: 'idle' });
  });

  it('transitions to empty state on 404 and retries the last query on error', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('Not Found', { status: 404 }))
      .mockResolvedValueOnce(new Response('Server Error', { status: 500 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify([{ name: 'Norway' }]), { status: 200 }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const states: SearchState[] = [];
    const controller = new CountrySearchController({
      debounceMs: 200,
      onStateChange: (state) => states.push(state),
    });

    controller.handleInput('zzzz');
    vi.advanceTimersByTime(200);
    await vi.runAllTimersAsync();
    expect(states.at(-1)).toEqual({ status: 'empty', query: 'zzzz' });

    controller.handleInput('norway');
    vi.advanceTimersByTime(200);
    await vi.runAllTimersAsync();
    expect(states.at(-1)?.status).toBe('error');

    controller.retry();
    await vi.runAllTimersAsync();
    const afterRetry = states.at(-1);
    expect(afterRetry?.status).toBe('success');
    if (afterRetry?.status === 'success') {
      expect(afterRetry.query).toBe('norway');
      expect(afterRetry.countries[0]?.name).toBe('Norway');
    }
  });
});
