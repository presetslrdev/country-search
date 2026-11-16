export interface ElementOptions {
  className?: string;
  text?: string;
  attributes?: Record<string, string>;
}

/**
 * Safely creates a DOM element using textContent and explicit attributes
 * without ever using innerHTML or insertAdjacentHTML.
 */
export function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: ElementOptions = {},
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);

  if (options.className) {
    element.className = options.className;
  }

  if (options.text !== undefined) {
    element.textContent = options.text;
  }

  if (options.attributes) {
    for (const [key, value] of Object.entries(options.attributes)) {
      element.setAttribute(key, value);
    }
  }

  return element;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}
