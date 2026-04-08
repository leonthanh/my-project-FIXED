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

// Mock ReactQuill to avoid findDOMNode deprecation during tests
jest.mock('react-quill', () => {
  const React = require('react');

  const ReactQuillMock = React.forwardRef(({ value = '', onChange }, ref) => {
    const editorApi = React.useMemo(
      () => ({
        root: { innerHTML: value || '' },
        getSelection: () => ({ index: 0 }),
        getLength: () => String(value || '').length,
        insertText: jest.fn(),
        setSelection: jest.fn(),
        insertEmbed: jest.fn(),
      }),
      [value]
    );

    React.useImperativeHandle(
      ref,
      () => ({
        getEditor: () => editorApi,
      }),
      [editorApi]
    );

    return React.createElement('textarea', {
      'data-testid': 'react-quill-mock',
      value,
      onChange: (e) => onChange && onChange(e.target.value),
    });
  });

  ReactQuillMock.displayName = 'ReactQuillMock';
  return ReactQuillMock;
});

jest.mock('quill', () => {
  const MockQuill = function MockQuill() {};
  MockQuill.import = jest.fn(() => ({}));
  MockQuill.register = jest.fn();
  return MockQuill;
});

if (!window.matchMedia) {
  window.matchMedia = () => ({
    matches: false,
    media: '',
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

if (!global.fetch) {
  global.fetch = jest.fn(() => Promise.reject(new Error('fetch mock not configured')));
}

if (!window.fetch) {
  window.fetch = global.fetch;
}

// Suppress React Router future-flag warnings and findDOMNode deprecation in tests (they are informational and clutter CI output)
const _origWarn = console.warn;
const _origError = console.error;
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
  jest.spyOn(console, 'error').mockImplementation((...args) => {
    try {
      const msg = String(args[0] || '');
      if (msg.includes('findDOMNode is deprecated')) {
        return; // ignore findDOMNode deprecation errors originating from ReactQuill in tests
      }
    } catch (e) {}
    return _origError.apply(console, args);
  });
});
afterAll(() => {
  console.warn.mockRestore && console.warn.mockRestore();
  console.error.mockRestore && console.error.mockRestore();
});
