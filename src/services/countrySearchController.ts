import { searchCountries } from '../api/countriesApi.js';
import { classifySearchError } from '../errors/errorClassifier.js';
import { mapCountryResponse } from '../mappers/countryMapper.js';
import type { CountryData, RawCountry } from '../types/country.js';
import { debounce, type DebouncedFunction } from '../utils/debounce.js';

export type SearchState =
  | { status: 'idle' }
  | { status: 'loading'; query: string }
  | { status: 'empty'; query: string }
  | { status: 'error'; query: string; message: string }
  | { status: 'success'; query: string; countries: CountryData[] };

export type CountryFetcher = (
  query: string,
  signal: AbortSignal,
) => Promise<RawCountry[]>;

export interface CountrySearchControllerOptions {
  debounceMs?: number;
  fetcher?: CountryFetcher;
  onStateChange: (state: SearchState) => void;
  onSearchSuccess?: (query: string) => void;
}

const DEFAULT_DEBOUNCE_MS = 350;

/**
 * Coordinates debounced input, immediate cancellation of outdated requests,
 * error classification, and retry behavior independently of the DOM.
 */
export class CountrySearchController {
  private readonly fetcher: CountryFetcher;
  private readonly onStateChange: (state: SearchState) => void;
  private readonly onSearchSuccess?: (query: string) => void;
  private readonly debouncedSearch: DebouncedFunction<[string]>;

  private activeController: AbortController | null = null;
  private lastQuery = '';

  constructor(options: CountrySearchControllerOptions) {
    this.fetcher = options.fetcher ?? searchCountries;
    this.onStateChange = options.onStateChange;
    this.onSearchSuccess = options.onSearchSuccess;
    this.debouncedSearch = debounce((query: string) => {
      void this.executeSearch(query);
    }, options.debounceMs ?? DEFAULT_DEBOUNCE_MS);
  }

  handleInput(rawQuery: string): void {
    const query = rawQuery.trim();
    this.lastQuery = query;
    this.cancelPending();

    if (query.length === 0) {
      this.onStateChange({ status: 'idle' });
      return;
    }

    this.debouncedSearch(query);
  }

  searchImmediately(rawQuery: string): void {
    const query = rawQuery.trim();
    this.lastQuery = query;
    this.cancelPending();

    if (query.length === 0) {
      this.onStateChange({ status: 'idle' });
      return;
    }

    void this.executeSearch(query);
  }

  retry(): void {
    if (this.lastQuery.length === 0) {
      return;
    }

    this.searchImmediately(this.lastQuery);
  }

  destroy(): void {
    this.cancelPending();
  }

  private cancelPending(): void {
    this.debouncedSearch.cancel();

    if (this.activeController) {
      this.activeController.abort(
        new DOMException('Superseded by newer search input.', 'AbortError'),
      );
      this.activeController = null;
    }
  }

  private async executeSearch(query: string): Promise<void> {
    const controller = new AbortController();
    this.activeController = controller;
    this.onStateChange({ status: 'loading', query });

    try {
      const rawCountries = await this.fetcher(query, controller.signal);

      if (controller.signal.aborted) {
        return;
      }

      const countries = rawCountries.map(mapCountryResponse);
      if (countries.length === 0) {
        this.onStateChange({ status: 'empty', query });
      } else {
        this.onStateChange({ status: 'success', query, countries });
        this.onSearchSuccess?.(query);
      }
    } catch (error) {
      const classified = classifySearchError(error);
      if (classified.kind === 'aborted') {
        return;
      }

      this.onStateChange({
        status: 'error',
        query,
        message: classified.message,
      });
    } finally {
      if (this.activeController === controller) {
        this.activeController = null;
      }
    }
  }
}
