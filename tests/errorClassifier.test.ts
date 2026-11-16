import { describe, expect, it } from 'vitest';
import { classifySearchError } from '../src/errors/errorClassifier.js';
import { HttpError } from '../src/errors/httpError.js';

describe('classifySearchError', () => {
  it('identifies DOMException AbortError as silent aborted kind', () => {
    const error = new DOMException('The operation was aborted.', 'AbortError');
    expect(classifySearchError(error)).toEqual({ kind: 'aborted' });
  });

  it('identifies DOMException TimeoutError as timeout error', () => {
    const error = new DOMException('The operation timed out.', 'TimeoutError');
    const result = classifySearchError(error);

    expect(result.kind).toBe('timeout');
    if (result.kind === 'timeout') {
      expect(result.message).toMatch(/timed out/i);
    }
  });

  it('distinguishes TimeoutError from AbortError', () => {
    const abort = classifySearchError(
      new DOMException('aborted', 'AbortError'),
    );
    const timeout = classifySearchError(
      new DOMException('timed out', 'TimeoutError'),
    );

    expect(abort.kind).not.toBe(timeout.kind);
  });

  it('identifies HttpError and preserves status code', () => {
    const error = new HttpError(502, 'Bad Gateway');
    const result = classifySearchError(error);

    expect(result).toEqual({
      kind: 'http',
      status: 502,
      message: 'Server returned an error (502). Please try again.',
    });
  });

  it('classifies generic TypeError / network failures as network error', () => {
    const error = new TypeError('Failed to fetch');
    const result = classifySearchError(error);

    expect(result.kind).toBe('network');
    if (result.kind === 'network') {
      expect(result.message).toMatch(/network|connection/i);
    }
  });

  it('handles unknown thrown values gracefully', () => {
    const result = classifySearchError('unexpected string error');
    expect(result.kind).toBe('unknown');
  });
});
