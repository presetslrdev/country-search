import { describe, expect, it } from 'vitest';
import { mapCountryResponse } from '../src/mappers/countryMapper.js';
import type { RawCountry } from '../src/types/country.js';

const spainFixture: RawCountry = {
  name: 'Spain',
  nativeName: 'España',
  alpha2Code: 'ES',
  alpha3Code: 'ESP',
  capital: 'Madrid',
  region: 'Europe',
  subregion: 'Southern Europe',
  population: 47351567,
  area: 505992,
  populationDensity: 93.58,
  borders: ['AND', 'FRA', 'GIB', 'PRT', 'MAR'],
  languages: [{ name: 'Spanish', iso639_1: 'es', nativeName: 'Español' }],
  currencies: [{ code: 'EUR', name: 'Euro', symbol: '€' }],
  timezones: ['UTC', 'UTC+01:00'],
  flags: {
    png: 'https://flagcdn.com/w320/es.png',
    svg: 'https://flagcdn.com/es.svg',
  },
  flag: '🇪🇸',
};

describe('mapCountryResponse', () => {
  it('maps a complete raw country object into CountryData', () => {
    const result = mapCountryResponse(spainFixture);

    expect(result).toEqual({
      id: 'ESP',
      name: 'Spain',
      nativeName: 'España',
      flagUrl: 'https://flagcdn.com/es.svg',
      flagAlt: 'Flag of Spain',
      flagEmoji: '🇪🇸',
      capital: 'Madrid',
      region: 'Europe',
      subregion: 'Southern Europe',
      population: 47351567,
      area: 505992,
      populationDensity: 93.58,
      borders: ['AND', 'FRA', 'GIB', 'PRT', 'MAR'],
      languages: ['Spanish'],
      currencies: ['Euro (€)'],
      timezones: ['UTC', 'UTC+01:00'],
    });
  });

  it('provides safe defaults when optional fields are missing', () => {
    const minimal: RawCountry = {
      name: 'Antarctica',
    };

    const result = mapCountryResponse(minimal);

    expect(result).toEqual({
      id: 'Antarctica',
      name: 'Antarctica',
      nativeName: 'Antarctica',
      flagUrl: '',
      flagAlt: 'Flag of Antarctica',
      flagEmoji: '',
      capital: '—',
      region: '—',
      subregion: '—',
      population: 0,
      area: null,
      populationDensity: null,
      borders: [],
      languages: [],
      currencies: [],
      timezones: [],
    });
  });

  it('falls back to png flag when svg is absent and formats currencies without symbol', () => {
    const raw: RawCountry = {
      name: 'Testland',
      alpha2Code: 'TL',
      flags: { png: 'https://example.com/tl.png' },
      currencies: [{ code: 'TLD', name: 'Test Dollar' }],
      languages: [{ name: 'Testish' }, { name: 'English' }],
    };

    const result = mapCountryResponse(raw);

    expect(result.id).toBe('TL');
    expect(result.flagUrl).toBe('https://example.com/tl.png');
    expect(result.currencies).toEqual(['Test Dollar (TLD)']);
    expect(result.languages).toEqual(['Testish', 'English']);
  });

  it('does not mutate the input object or its arrays', () => {
    const borders = ['FRA', 'PRT'];
    const raw: RawCountry = { ...spainFixture, borders };
    const result = mapCountryResponse(raw);

    result.borders.push('ITA');
    expect(borders).toEqual(['FRA', 'PRT']);
  });
});
