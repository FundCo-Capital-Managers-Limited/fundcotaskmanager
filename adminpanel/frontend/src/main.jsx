//main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import './index.css';
import { installSensitiveStorageShim } from './security/sessionStorageShim.js';
import { installAppVersionGuards } from './utils/appVersion.js';

installSensitiveStorageShim();
installAppVersionGuards('fundco-v1-admin');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
);



