import { normalizeUrlLike, resolveHostPath } from '../assetUrls';

describe('asset URL helpers', () => {
  test('normalizes legacy upload paths to /uploads', () => {
    expect(normalizeUrlLike('/upload/audio/test.mp3')).toBe('/uploads/audio/test.mp3');
    expect(normalizeUrlLike('backend/uploads/audio/test.mp3')).toBe('/uploads/audio/test.mp3');
  });

  test('resolves relative upload paths against the configured host', () => {
    expect(resolveHostPath('https://ix.star-siec.edu.vn', '/uploads/audio/test.mp3')).toBe(
      'https://ix.star-siec.edu.vn/uploads/audio/test.mp3'
    );
  });

  test('rewrites absolute backend upload URLs onto the current host', () => {
    expect(
      resolveHostPath(
        'https://ix.star-siec.edu.vn',
        'http://localhost:5000/backend/uploads/audio/test.mp3?x=1'
      )
    ).toBe('https://ix.star-siec.edu.vn/uploads/audio/test.mp3?x=1');
  });

  test('preserves blob and data URLs as-is', () => {
    expect(resolveHostPath('https://ix.star-siec.edu.vn', 'blob:https://example.com/file')).toBe(
      'blob:https://example.com/file'
    );
    expect(resolveHostPath('https://ix.star-siec.edu.vn', 'data:audio/mp3;base64,abc')).toBe(
      'data:audio/mp3;base64,abc'
    );
  });
});