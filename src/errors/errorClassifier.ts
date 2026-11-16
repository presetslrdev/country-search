import { HttpError } from './httpError.js';

export type ClassifiedSearchError =
  | { kind: 'aborted' }
  | { kind: 'timeout'; message: string }
  | { kind: 'http'; status: number; message: string }
  | { kind: 'network'; message: string }
  | { kind: 'unknown'; message: string };

function getErrorName(error: unknown): string | undefined {
  if (error instanceof Error || error instanceof DOMException) {
    return error.name;
  }
  if (typeof error === 'object' && error !== null && 'name' in error) {
    const maybeName = (error as { name: unknown }).name;
    return typeof maybeName === 'string' ? maybeName : undefined;
  }
  return undefined;
}

/**
 * Classifies an error thrown during country search so user-initiated
 * cancellations are ignored while timeouts, HTTP errors, and network failures
 * produce actionable messages.
 */
export function classifySearchError(error: unknown): ClassifiedSearchError {
  const name = getErrorName(error);

  if (name === 'AbortError') {
    return { kind: 'aborted' };
  }

  if (name === 'TimeoutError') {
    return {
      kind: 'timeout',
      message: 'Request timed out. Please check your connection and try again.',
    };
  }

  if (error instanceof HttpError) {
    return {
      kind: 'http',
      status: error.status,
      message: `Server returned an error (${error.status}). Please try again.`,
    };
  }

  if (error instanceof TypeError) {
    return {
      kind: 'network',
      message: 'Network error. Check your internet connection and try again.',
    };
  }

  return {
    kind: 'unknown',
    message: 'Something went wrong while searching. Please try again.',
  };
}
