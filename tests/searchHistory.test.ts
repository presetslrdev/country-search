import { beforeEach, describe, expect, it } from 'vitest';
import { SearchHistoryStorage } from '../src/storage/searchHistory.js';

describe('SearchHistoryStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('adds queries with most recent first and deduplicates case-insensitively', () => {
    const history = new SearchHistoryStorage('test-history', 5);

    history.add('Spain');
    history.add('France');
    history.add('spain');

    expect(history.getAll()).toEqual(['spain', 'France']);
  });

  it('limits stored history to maxItems', () => {
    const history = new SearchHistoryStorage('test-history', 3);

    history.add('one');
    history.add('two');
    history.add('three');
    history.add('four');

    expect(history.getAll()).toEqual(['four', 'three', 'two']);
  });

  it('ignores blank queries and handles corrupted JSON in localStorage', () => {
    localStorage.setItem('test-history', '{not valid json');
    const history = new SearchHistoryStorage('test-history', 5);

    expect(history.getAll()).toEqual([]);

    history.add('   ');
    expect(history.getAll()).toEqual([]);
  });

  it('clears all stored entries', () => {
    const history = new SearchHistoryStorage('test-history', 5);
    history.add('Germany');
    history.clear();

    expect(history.getAll()).toEqual([]);
  });
});
