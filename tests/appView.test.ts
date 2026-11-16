import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpError } from '../src/errors/httpError.js';
import { SearchHistoryStorage } from '../src/storage/searchHistory.js';
import type { RawCountry } from '../src/types/country.js';
import { AppView } from '../src/ui/appView.js';

const japanFixture: RawCountry = {
  name: 'Japan',
  nativeName: '日本',
  alpha3Code: 'JPN',
  capital: 'Tokyo',
  region: 'Asia',
  subregion: 'Eastern Asia',
  population: 125836021,
  area: 377930,
  languages: [{ name: 'Japanese' }],
  currencies: [{ code: 'JPY', name: 'Japanese yen', symbol: '¥' }],
  flags: { svg: 'https://flagcdn.com/jp.svg' },
  flag: '🇯🇵',
};

async function flushMicrotasks(): Promise<void> {
  for (let i = 0; i < 10; i += 1) {
    await Promise.resolve();
  }
}

describe('AppView integration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    document.body.replaceChildren();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders cards on search, opens detail modal on click, and closes on Escape', async () => {
    const fetcher = vi.fn().mockResolvedValue([japanFixture]);
    const app = new AppView({
      root: document.body,
      fetcher,
      historyStorage: new SearchHistoryStorage('ui-test-history', 5),
      debounceMs: 200,
    });

    const input = document.querySelector<HTMLInputElement>('.search-input');
    expect(input).not.toBeNull();

    input!.value = 'japan';
    input!.dispatchEvent(new Event('input'));

    vi.advanceTimersByTime(200);
    await flushMicrotasks();

    const card = document.querySelector<HTMLButtonElement>('.country-card');
    expect(card).not.toBeNull();
    expect(card!.textContent).toContain('Japan');
    expect(card!.textContent).toContain('Tokyo');

    card!.click();
    const modalBackdrop =
      document.querySelector<HTMLElement>('.modal-backdrop');
    expect(modalBackdrop?.hasAttribute('hidden')).toBe(false);
    expect(modalBackdrop?.textContent).toContain('Japanese yen (¥)');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(modalBackdrop?.hasAttribute('hidden')).toBe(true);

    app.destroy();
  });

  it('retries the last failed query when Retry button is clicked', async () => {
    const fetcher = vi
      .fn()
      .mockRejectedValueOnce(new HttpError(500, 'Server Error'))
      .mockResolvedValueOnce([japanFixture]);

    const app = new AppView({
      root: document.body,
      fetcher,
      historyStorage: new SearchHistoryStorage('ui-test-history', 5),
      debounceMs: 200,
    });

    const input = document.querySelector<HTMLInputElement>('.search-input')!;
    input.value = 'japan';
    input.dispatchEvent(new Event('input'));

    vi.advanceTimersByTime(200);
    await flushMicrotasks();

    const retryButton =
      document.querySelector<HTMLButtonElement>('.retry-button');
    expect(retryButton).not.toBeNull();

    retryButton!.click();
    await flushMicrotasks();

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(document.querySelector('.country-card')?.textContent).toContain(
      'Japan',
    );

    app.destroy();
  });

  it('reuses cached results when clicking a history chip', async () => {
    const fetcher = vi.fn().mockResolvedValue([japanFixture]);
    const app = new AppView({
      root: document.body,
      fetcher,
      historyStorage: new SearchHistoryStorage('ui-test-history', 5),
      debounceMs: 200,
    });

    const input = document.querySelector<HTMLInputElement>('.search-input')!;
    input.value = 'japan';
    input.dispatchEvent(new Event('input'));
    vi.advanceTimersByTime(200);
    await flushMicrotasks();

    const clearButton =
      document.querySelector<HTMLButtonElement>('.clear-button')!;
    clearButton.click();

    const historyChip =
      document.querySelector<HTMLButtonElement>('.history-chip');
    expect(historyChip?.textContent).toBe('japan');

    historyChip!.click();
    await flushMicrotasks();

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(document.querySelector('.country-card')?.textContent).toContain(
      'Japan',
    );

    app.destroy();
  });
});
