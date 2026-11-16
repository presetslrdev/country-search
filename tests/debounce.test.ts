import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { debounce } from '../src/utils/debounce.js';

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('delays function execution until after delay ms have elapsed', () => {
    const spy = vi.fn();
    const debounced = debounce(spy, 300);

    debounced('spain');
    expect(spy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(299);
    expect(spy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('spain');
  });

  it('resets the timer when called again before delay expires', () => {
    const spy = vi.fn();
    const debounced = debounce(spy, 300);

    debounced('s');
    vi.advanceTimersByTime(200);
    debounced('sp');
    vi.advanceTimersByTime(200);
    debounced('spa');

    expect(spy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(299);
    expect(spy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('spa');
  });

  it('allows multiple separate invocations when calls are spaced apart', () => {
    const spy = vi.fn();
    const debounced = debounce(spy, 250);

    debounced('first');
    vi.advanceTimersByTime(250);
    debounced('second');
    vi.advanceTimersByTime(250);

    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenNthCalledWith(1, 'first');
    expect(spy).toHaveBeenNthCalledWith(2, 'second');
  });

  it('cancels pending execution when cancel() is called', () => {
    const spy = vi.fn();
    const debounced = debounce(spy, 300);

    debounced('germany');
    vi.advanceTimersByTime(150);
    debounced.cancel();
    vi.advanceTimersByTime(300);

    expect(spy).not.toHaveBeenCalled();
  });
});
