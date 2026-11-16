import { createElement } from './domHelpers.js';

export function createIdleView(): HTMLElement {
  const panel = createElement('section', {
    className: 'state-panel',
    attributes: { 'aria-live': 'polite' },
  });

  const title = createElement('h2', {
    className: 'state-title',
    text: 'Start typing a country name',
  });
  const description = createElement('p', {
    className: 'state-description',
    text: 'Try "Spain", "Japan", or "Brazil". Outdated requests are automatically cancelled as you type.',
  });

  panel.append(title, description);
  return panel;
}

export function createLoadingView(query: string): HTMLElement {
  const panel = createElement('section', {
    className: 'state-panel',
    attributes: {
      role: 'status',
      'aria-live': 'polite',
    },
  });

  const spinner = createElement('div', {
    className: 'spinner',
    attributes: { 'aria-hidden': 'true' },
  });
  const title = createElement('h2', {
    className: 'state-title',
    text: `Searching for "${query}"...`,
  });

  panel.append(spinner, title);
  return panel;
}

export function createEmptyView(query: string): HTMLElement {
  const panel = createElement('section', {
    className: 'state-panel state-panel--empty',
    attributes: { 'aria-live': 'polite' },
  });

  const title = createElement('h2', {
    className: 'state-title',
    text: 'Nothing found',
  });
  const description = createElement('p', {
    className: 'state-description',
    text: `No countries matched "${query}". Check the spelling or try a different name.`,
  });

  panel.append(title, description);
  return panel;
}

export function createErrorView(
  message: string,
  onRetry: () => void,
): HTMLElement {
  const panel = createElement('section', {
    className: 'state-panel state-panel--error',
    attributes: { role: 'alert' },
  });

  const title = createElement('h2', {
    className: 'state-title',
    text: 'Could not load countries',
  });
  const description = createElement('p', {
    className: 'state-description',
    text: message,
  });
  const retryButton = createElement('button', {
    className: 'retry-button',
    text: 'Retry',
    attributes: { type: 'button' },
  });
  retryButton.addEventListener('click', onRetry);

  panel.append(title, description, retryButton);
  return panel;
}
