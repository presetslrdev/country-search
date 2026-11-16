import { searchCountries } from '../api/countriesApi.js';
import { createCachedCountryFetcher } from '../api/countryCache.js';
import {
  CountrySearchController,
  type CountryFetcher,
  type SearchState,
} from '../services/countrySearchController.js';
import { SearchHistoryStorage } from '../storage/searchHistory.js';
import { createCountryCard } from './countryCard.js';
import { CountryModal } from './countryModal.js';
import { createElement } from './domHelpers.js';
import {
  createEmptyView,
  createErrorView,
  createIdleView,
  createLoadingView,
} from './stateViews.js';

export interface AppViewOptions {
  root: HTMLElement;
  fetcher?: CountryFetcher;
  historyStorage?: SearchHistoryStorage;
  debounceMs?: number;
}

/**
 * Top-level UI coordinator that builds the DOM tree programmatically
 * and connects user interactions to CountrySearchController.
 */
export class AppView {
  private readonly controller: CountrySearchController;
  private readonly historyStorage: SearchHistoryStorage;
  private readonly modal: CountryModal;
  private readonly input: HTMLInputElement;
  private readonly clearButton: HTMLButtonElement;
  private readonly historyBar: HTMLDivElement;
  private readonly contentArea: HTMLElement;

  constructor(options: AppViewOptions) {
    this.historyStorage = options.historyStorage ?? new SearchHistoryStorage();
    this.modal = new CountryModal();

    const cachedFetcher = createCachedCountryFetcher(
      options.fetcher ?? searchCountries,
    );

    this.controller = new CountrySearchController({
      debounceMs: options.debounceMs,
      fetcher: cachedFetcher,
      onStateChange: (state) => this.renderState(state),
      onSearchSuccess: (query) => {
        this.historyStorage.add(query);
        this.renderHistory();
      },
    });

    const container = createElement('main', { className: 'app-container' });

    const header = createElement('header', { className: 'app-header' });
    const title = createElement('h1', {
      className: 'app-title',
      text: 'Country Search',
    });
    const subtitle = createElement('p', {
      className: 'app-subtitle',
      text: 'Live search powered by countries.dev with automatic cancellation of outdated requests.',
    });
    header.append(title, subtitle);

    const searchSection = createElement('section', {
      className: 'search-section',
    });
    const searchBox = createElement('div', { className: 'search-box' });

    this.input = createElement('input', {
      className: 'search-input',
      attributes: {
        type: 'search',
        placeholder: 'Search countries by name (e.g. Spain, Japan)...',
        'aria-label': 'Search countries by name',
        autocomplete: 'off',
      },
    });

    this.clearButton = createElement('button', {
      className: 'clear-button',
      text: '×',
      attributes: {
        type: 'button',
        'aria-label': 'Clear search query',
        hidden: 'true',
      },
    });

    searchBox.append(this.input, this.clearButton);

    this.historyBar = createElement('div', {
      className: 'history-bar',
      attributes: { 'aria-label': 'Recent searches', hidden: 'true' },
    });

    searchSection.append(searchBox, this.historyBar);

    this.contentArea = createElement('section', {
      className: 'results-section',
    });

    container.append(header, searchSection, this.contentArea);
    options.root.replaceChildren(container, this.modal.element);

    this.bindEvents();
    this.renderHistory();
    this.renderState({ status: 'idle' });
  }

  destroy(): void {
    this.controller.destroy();
    this.modal.destroy();
  }

  private bindEvents(): void {
    this.input.addEventListener('input', () => {
      this.syncClearButton();
      this.controller.handleInput(this.input.value);
    });

    this.clearButton.addEventListener('click', () => {
      this.input.value = '';
      this.syncClearButton();
      this.controller.handleInput('');
      this.input.focus();
    });
  }

  private syncClearButton(): void {
    if (this.input.value.trim().length > 0) {
      this.clearButton.removeAttribute('hidden');
    } else {
      this.clearButton.setAttribute('hidden', 'true');
    }
  }

  private renderHistory(): void {
    const items = this.historyStorage.getAll();
    if (items.length === 0) {
      this.historyBar.replaceChildren();
      this.historyBar.setAttribute('hidden', 'true');
      return;
    }

    const label = createElement('span', {
      className: 'history-label',
      text: 'Recent:',
    });

    const chips = items.map((query) => {
      const chip = createElement('button', {
        className: 'history-chip',
        text: query,
        attributes: { type: 'button' },
      });
      chip.addEventListener('click', () => {
        this.input.value = query;
        this.syncClearButton();
        this.controller.searchImmediately(query);
      });
      return chip;
    });

    const clearHistoryButton = createElement('button', {
      className: 'history-clear',
      text: 'Clear history',
      attributes: { type: 'button' },
    });
    clearHistoryButton.addEventListener('click', () => {
      this.historyStorage.clear();
      this.renderHistory();
    });

    this.historyBar.replaceChildren(label, ...chips, clearHistoryButton);
    this.historyBar.removeAttribute('hidden');
  }

  private renderState(state: SearchState): void {
    switch (state.status) {
      case 'idle':
        this.contentArea.replaceChildren(createIdleView());
        return;

      case 'loading':
        this.contentArea.replaceChildren(createLoadingView(state.query));
        return;

      case 'empty':
        this.contentArea.replaceChildren(createEmptyView(state.query));
        return;

      case 'error':
        this.contentArea.replaceChildren(
          createErrorView(state.message, () => this.controller.retry()),
        );
        return;

      case 'success': {
        const countLabel =
          state.countries.length === 1 ? 'country' : 'countries';
        const meta = createElement('p', {
          className: 'results-meta',
          text: `Found ${state.countries.length} ${countLabel} for "${state.query}"`,
        });
        const grid = createElement('div', { className: 'country-grid' });
        const cards = state.countries.map((country) =>
          createCountryCard(country, (selected) => this.modal.open(selected)),
        );
        grid.append(...cards);
        this.contentArea.replaceChildren(meta, grid);
      }
    }
  }
}
