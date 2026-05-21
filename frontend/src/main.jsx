import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { BrowserRouter } from 'react-router-dom';
import { installUserAxiosAuth } from './security/authClient.js';
import { installSensitiveStorageShim } from './security/sessionStorageShim.js';
import { installAppVersionGuards } from './utils/appVersion.js';

installSensitiveStorageShim();
installUserAxiosAuth();
installAppVersionGuards('fundco-v1-user');

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
