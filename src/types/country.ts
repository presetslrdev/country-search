export interface RawCountryLanguage {
  name: string;
  iso639_1?: string;
  iso639_2?: string;
  nativeName?: string;
}

export interface RawCountryCurrency {
  code: string;
  name: string;
  symbol?: string;
}

export interface RawCountryFlags {
  png?: string;
  svg?: string;
}

export interface RawCountry {
  name: string;
  nativeName?: string;
  alpha2Code?: string;
  alpha3Code?: string;
  capital?: string;
  region?: string;
  subregion?: string;
  population?: number;
  area?: number;
  populationDensity?: number;
  borders?: string[];
  languages?: RawCountryLanguage[];
  currencies?: RawCountryCurrency[];
  timezones?: string[];
  flags?: RawCountryFlags;
  flag?: string;
  demonym?: string;
}

export interface CountryData {
  id: string;
  name: string;
  nativeName: string;
  flagUrl: string;
  flagAlt: string;
  flagEmoji: string;
  capital: string;
  region: string;
  subregion: string;
  population: number;
  area: number | null;
  populationDensity: number | null;
  borders: string[];
  languages: string[];
  currencies: string[];
  timezones: string[];
}
