import type {
  CountryData,
  RawCountry,
  RawCountryCurrency,
} from '../types/country.js';

function formatCurrency(currency: RawCountryCurrency): string {
  const suffix = currency.symbol ?? currency.code;
  return suffix ? `${currency.name} (${suffix})` : currency.name;
}

/**
 * Pure mapper transforming a raw countries.dev payload into normalized UI data.
 */
export function mapCountryResponse(raw: RawCountry): CountryData {
  return {
    id: raw.alpha3Code ?? raw.alpha2Code ?? raw.name,
    name: raw.name,
    nativeName: raw.nativeName ?? raw.name,
    flagUrl: raw.flags?.svg ?? raw.flags?.png ?? '',
    flagAlt: `Flag of ${raw.name}`,
    flagEmoji: raw.flag ?? '',
    capital: raw.capital && raw.capital.trim().length > 0 ? raw.capital : '—',
    region: raw.region && raw.region.trim().length > 0 ? raw.region : '—',
    subregion:
      raw.subregion && raw.subregion.trim().length > 0 ? raw.subregion : '—',
    population: raw.population ?? 0,
    area: raw.area ?? null,
    populationDensity: raw.populationDensity ?? null,
    borders: raw.borders ? [...raw.borders] : [],
    languages: raw.languages ? raw.languages.map((lang) => lang.name) : [],
    currencies: raw.currencies ? raw.currencies.map(formatCurrency) : [],
    timezones: raw.timezones ? [...raw.timezones] : [],
  };
}
