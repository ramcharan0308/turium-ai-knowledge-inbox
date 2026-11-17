import { describe, it, expect } from 'vitest';
import { ApiError } from '../api/client';

describe('ApiError Mapping & Behavior', () => {
  it('correctly maps SSRF_RESTRICTED to a clear human-readable explanation', () => {
    const error = new ApiError(422, 'SSRF_RESTRICTED', 'Target address is restricted');
    expect(error.getUserMessage()).toContain('Security restriction: Private, localhost, and cloud metadata');
  });

  it('correctly maps EXTRACTION_FAILED', () => {
    const error = new ApiError(422, 'EXTRACTION_FAILED', 'No article content found');
    expect(error.getUserMessage()).toContain('Unable to extract meaningful readable text');
  });

  it('correctly maps PROVIDER_AUTH_ERROR', () => {
    const error = new ApiError(401, 'PROVIDER_AUTH_ERROR', 'API_KEY_INVALID');
    expect(error.getUserMessage()).toContain('AI provider authentication failed');
  });

  it('correctly maps PROVIDER_RATE_LIMIT', () => {
    const error = new ApiError(429, 'PROVIDER_RATE_LIMIT', 'Quota exceeded');
    expect(error.getUserMessage()).toContain('AI provider rate limit reached');
  });

  it('correctly maps PAYLOAD_TOO_LARGE', () => {
    const error = new ApiError(413, 'PAYLOAD_TOO_LARGE', 'Payload too large');
    expect(error.getUserMessage()).toContain('Content is too large');
  });

  it('falls back to message when error code is unknown', () => {
    const error = new ApiError(500, 'CUSTOM_ERROR', 'Custom failure detail');
    expect(error.getUserMessage()).toBe('Custom failure detail');
  });
});
