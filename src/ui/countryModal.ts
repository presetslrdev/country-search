import type { CountryData } from '../types/country.js';
import { createElement, formatNumber } from './domHelpers.js';

function createDetailItem(label: string, value: string): HTMLDivElement {
  const item = createElement('div', { className: 'modal-detail-item' });
  const dt = createElement('dt', {
    className: 'modal-detail-label',
    text: label,
  });
  const dd = createElement('dd', {
    className: 'modal-detail-value',
    text: value,
  });
  item.append(dt, dd);
  return item;
}

/**
 * Accessible modal displaying extended metadata for a selected country.
 */
export class CountryModal {
  readonly element: HTMLDivElement;
  private readonly dialog: HTMLDivElement;
  private readonly closeButton: HTMLButtonElement;
  private readonly titleEl: HTMLHeadingElement;
  private readonly subtitleEl: HTMLParagraphElement;
  private readonly flagContainer: HTMLDivElement;
  private readonly detailsList: HTMLDListElement;
  private lastFocusedElement: HTMLElement | null = null;

  constructor() {
    this.element = createElement('div', {
      className: 'modal-backdrop',
      attributes: { hidden: 'true' },
    });

    this.dialog = createElement('div', {
      className: 'modal-dialog',
      attributes: {
        role: 'dialog',
        'aria-modal': 'true',
        'aria-labelledby': 'country-modal-title',
      },
    });

    const header = createElement('div', { className: 'modal-header' });
    const titleGroup = createElement('div');
    this.titleEl = createElement('h2', {
      className: 'modal-title',
      attributes: { id: 'country-modal-title' },
    });
    this.subtitleEl = createElement('p', { className: 'modal-subtitle' });
    titleGroup.append(this.titleEl, this.subtitleEl);

    this.closeButton = createElement('button', {
      className: 'modal-close',
      text: '×',
      attributes: {
        type: 'button',
        'aria-label': 'Close country details',
      },
    });

    header.append(titleGroup, this.closeButton);
    this.flagContainer = createElement('div');
    this.detailsList = createElement('dl', { className: 'modal-details' });

    this.dialog.append(header, this.flagContainer, this.detailsList);
    this.element.append(this.dialog);

    this.closeButton.addEventListener('click', () => this.close());
    this.element.addEventListener('click', (event) => {
      if (event.target === this.element) {
        this.close();
      }
    });
    document.addEventListener('keydown', this.handleKeyDown);
  }

  open(country: CountryData): void {
    this.lastFocusedElement =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    this.titleEl.textContent = country.flagEmoji
      ? `${country.flagEmoji} ${country.name}`
      : country.name;
    this.subtitleEl.textContent =
      country.nativeName !== country.name
        ? `Native name: ${country.nativeName}`
        : '';

    this.flagContainer.replaceChildren();
    if (country.flagUrl) {
      const img = createElement('img', {
        className: 'modal-flag',
        attributes: {
          src: country.flagUrl,
          alt: country.flagAlt,
        },
      });
      this.flagContainer.append(img);
    }

    const areaText =
      country.area !== null ? `${formatNumber(country.area)} km²` : '—';
    const densityText =
      country.populationDensity !== null
        ? `${country.populationDensity.toFixed(1)} / km²`
        : '—';

    this.detailsList.replaceChildren(
      createDetailItem('Capital', country.capital),
      createDetailItem('Region', country.region),
      createDetailItem('Subregion', country.subregion),
      createDetailItem('Population', formatNumber(country.population)),
      createDetailItem('Area', areaText),
      createDetailItem('Population Density', densityText),
      createDetailItem(
        'Languages',
        country.languages.length > 0 ? country.languages.join(', ') : '—',
      ),
      createDetailItem(
        'Currencies',
        country.currencies.length > 0 ? country.currencies.join(', ') : '—',
      ),
      createDetailItem(
        'Borders',
        country.borders.length > 0 ? country.borders.join(', ') : 'None',
      ),
      createDetailItem(
        'Timezones',
        country.timezones.length > 0 ? country.timezones.join(', ') : '—',
      ),
    );

    this.element.removeAttribute('hidden');
    this.closeButton.focus();
  }

  close(): void {
    if (this.element.hasAttribute('hidden')) {
      return;
    }

    this.element.setAttribute('hidden', 'true');
    this.lastFocusedElement?.focus();
    this.lastFocusedElement = null;
  }

  destroy(): void {
    document.removeEventListener('keydown', this.handleKeyDown);
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && !this.element.hasAttribute('hidden')) {
      this.close();
    }
  };
}
