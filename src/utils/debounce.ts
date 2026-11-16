export type DebouncedFunction<TArgs extends unknown[]> = ((
  ...args: TArgs
) => void) & {
  cancel: () => void;
};

/**
 * Delays invoking `fn` until after `delay` milliseconds have elapsed
 * since the last time the debounced function was called.
 */
export function debounce<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void,
  delay: number,
): DebouncedFunction<TArgs> {
  let timerId: ReturnType<typeof setTimeout> | undefined;

  const debounced = (...args: TArgs): void => {
    if (timerId !== undefined) {
      clearTimeout(timerId);
    }

    timerId = setTimeout(() => {
      timerId = undefined;
      fn(...args);
    }, delay);
  };

  debounced.cancel = (): void => {
    if (timerId !== undefined) {
      clearTimeout(timerId);
      timerId = undefined;
    }
  };

  return debounced;
}
