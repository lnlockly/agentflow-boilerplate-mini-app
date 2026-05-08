import React from 'react';
import ReactDOM from 'react-dom/client';
import WebApp from '@twa-dev/sdk';
import App from './App';
import './index.css';

// Tell Telegram we're ready as soon as the bundle parses — without this
// the loader spinner stays up indefinitely on real devices.
try {
  WebApp.ready();
  WebApp.expand();
} catch {
  // Running outside Telegram (browser preview) — ignore.
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
