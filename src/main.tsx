import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Protect against benign Vite HMR websocket disconnection errors and unhandled rejections
if (typeof window !== 'undefined') {
  const isViteWsError = (msg: string) =>
    msg.includes('WebSocket') ||
    msg.includes('[vite]') ||
    msg.includes('failed to connect to websocket') ||
    msg.includes('closed without opened');

  window.addEventListener(
    'unhandledrejection',
    (event) => {
      const reason = event.reason;
      const msg = (reason && (reason.message || reason.stack || String(reason))) || '';
      if (typeof msg === 'string' && isViteWsError(msg)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true
  );

  window.addEventListener(
    'error',
    (event) => {
      const msg =
        (event && (event.message || (event.error && (event.error.message || event.error.stack)))) || '';
      if (typeof msg === 'string' && isViteWsError(msg)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
