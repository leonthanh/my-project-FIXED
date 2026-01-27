// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock heavy CKEditor build imports that attempt to inject styles during unit tests (jsdom)
jest.mock('@ckeditor/ckeditor5-react', () => ({
  CKEditor: ({ children }) => {
    // simple mock that renders a div for test purposes
    return require('react').createElement('div', { 'data-testid': 'ck-editor-mock' }, children);
  }
}));

jest.mock('@ckeditor/ckeditor5-build-decoupled-document', () => ({}));

// Suppress React Router future-flag warnings in tests (they are informational and clutter CI output)
const _origWarn = console.warn;
beforeAll(() => {
  jest.spyOn(console, 'warn').mockImplementation((...args) => {
    try {
      const msg = String(args[0] || '');
      if (msg.includes('React Router Future Flag') || msg.includes('Relative route resolution within Splat routes') || msg.includes('findDOMNode is deprecated')) {
        return; // ignore these specific warnings
      }
    } catch (e) {}
    return _origWarn.apply(console, args);
  });
});
afterAll(() => {
  console.warn.mockRestore && console.warn.mockRestore();
});
