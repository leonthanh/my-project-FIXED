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

// Suppress informational test noise even when individual tests call jest.restoreAllMocks().
const originalConsoleWarn = console.warn.bind(console);
const originalConsoleError = console.error.bind(console);

const ignoredWarnTokens = [
  'React Router Future Flag',
  'Relative route resolution within Splat routes',
  'v7_startTransition',
  'v7_relativeSplatPath',
  'findDOMNode is deprecated',
];

const shouldIgnoreConsoleOutput = (args, tokens) => {
  try {
    const message = (Array.isArray(args) ? args : []).map((entry) => String(entry || '')).join(' ');
    return tokens.some((token) => message.includes(token));
  } catch (_error) {
    return false;
  }
};

console.warn = (...args) => {
  if (shouldIgnoreConsoleOutput(args, ignoredWarnTokens)) {
    return;
  }
  return originalConsoleWarn(...args);
};

console.error = (...args) => {
  if (shouldIgnoreConsoleOutput(args, ['findDOMNode is deprecated'])) {
    return;
  }
  return originalConsoleError(...args);
};

afterAll(() => {
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
});
