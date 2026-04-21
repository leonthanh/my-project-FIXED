import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import 'react-quill/dist/quill.snow.css';
import App from './App.jsx';
import { ThemeProvider } from './shared/contexts/ThemeContext';
import AppErrorBoundary from './shared/components/AppErrorBoundary';
import { installReactQuillDevWarningFilter } from './shared/utils/reactQuillDevWarnings';

installReactQuillDevWarningFilter();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AppErrorBoundary>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </AppErrorBoundary>
  </React.StrictMode>
);
