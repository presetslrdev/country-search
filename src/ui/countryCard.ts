import type { CountryData } from '../types/country.js';
import { createElement, formatNumber } from './domHelpers.js';

function createFactLine(label: string, value: string): HTMLParagraphElement {
  const line = createElement('p', { className: 'country-card__fact' });
  const strong = createElement('strong', { text: `${label}: ` });
  line.append(strong, document.createTextNode(value));
  return line;
}

/**
 * Renders a clickable country summary card for the search results grid.
 */
export function createCountryCard(
  country: CountryData,
  onSelect: (country: CountryData) => void,
): HTMLButtonElement {
  const card = createElement('button', {
    className: 'country-card',
    attributes: {
      type: 'button',
      'aria-label': `View details for ${country.name}`,
    },
  });

  if (country.flagUrl) {
    const flag = createElement('img', {
      className: 'country-card__flag',
      attributes: {
        src: country.flagUrl,
        alt: country.flagAlt,
        loading: 'lazy',
      },
    });
    card.append(flag);
  } else {
    const placeholder = createElement('div', {
      className: 'country-card__flag-placeholder',
      text: country.flagEmoji || '🏳️',
      attributes: { 'aria-hidden': 'true' },
    });
    card.append(placeholder);
  }

  const body = createElement('div', { className: 'country-card__body' });
  const title = createElement('h2', {
    className: 'country-card__name',
    text: country.name,
  });

  const languagesText =
    country.languages.length > 0 ? country.languages.join(', ') : '—';

  body.append(
    title,
    createFactLine('Capital', country.capital),
    createFactLine('Region', country.region),
    createFactLine('Population', formatNumber(country.population)),
    createFactLine('Languages', languagesText),
  );

  card.append(body);
  card.addEventListener('click', () => onSelect(country));

  return card;
}
