const DEFAULT_STORAGE_KEY = 'country-search:history';
const DEFAULT_MAX_ITEMS = 8;

/**
 * Persists recent search queries in localStorage with safe fallbacks
 * for unavailable storage or corrupted payloads.
 */
export class SearchHistoryStorage {
  private readonly key: string;
  private readonly maxItems: number;

  constructor(
    key: string = DEFAULT_STORAGE_KEY,
    maxItems: number = DEFAULT_MAX_ITEMS,
  ) {
    this.key = key;
    this.maxItems = maxItems;
  }

  getAll(): string[] {
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) {
        return [];
      }
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed.filter(
        (item): item is string =>
          typeof item === 'string' && item.trim().length > 0,
      );
    } catch {
      return [];
    }
  }

  add(rawQuery: string): string[] {
    const query = rawQuery.trim();
    if (query.length === 0) {
      return this.getAll();
    }

    const normalized = query.toLowerCase();
    const updated = [
      query,
      ...this.getAll().filter((item) => item.toLowerCase() !== normalized),
    ].slice(0, this.maxItems);

    this.save(updated);
    return updated;
  }

  clear(): void {
    try {
      localStorage.removeItem(this.key);
    } catch {
      // Ignore storage errors in restricted environments
    }
  }

  private save(items: string[]): void {
    try {
      localStorage.setItem(this.key, JSON.stringify(items));
    } catch {
      // Ignore quota or private-mode errors
    }
  }
}
