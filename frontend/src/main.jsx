import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import 'react-quill/dist/quill.snow.css';
import App from './App.jsx';
import { ThemeProvider } from './shared/contexts/ThemeContext';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
