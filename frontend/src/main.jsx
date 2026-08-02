import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import 'react-quill/dist/quill.snow.css';
import App from './App.jsx';
import AppErrorBoundary from './shared/components/AppErrorBoundary';
import { installReactQuillDevWarningFilter } from './shared/utils/reactQuillDevWarnings';
import { DisplaySettingsProvider } from './shared/contexts/DisplaySettingsContext';

installReactQuillDevWarningFilter();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <DisplaySettingsProvider>
      <AppErrorBoundary>
        <App />
      </AppErrorBoundary>
    </DisplaySettingsProvider>
  </React.StrictMode>
);
