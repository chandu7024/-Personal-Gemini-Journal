import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global circular structure protection for JSON.stringify in client runtime
if (typeof window !== 'undefined' && window.JSON && window.JSON.stringify) {
  const nativeStringify = window.JSON.stringify;
  window.JSON.stringify = function (value: any, replacer?: any, space?: any) {
    try {
      return nativeStringify.call(window.JSON, value, replacer, space);
    } catch (err: any) {
      if (err && (err instanceof TypeError || String(err?.message || '').toLowerCase().includes('circular'))) {
        const seen = new WeakSet();
        return nativeStringify.call(
          window.JSON,
          value,
          function (this: any, key: string, val: any) {
            if (typeof val === 'object' && val !== null) {
              if (seen.has(val)) {
                return '[Circular]';
              }
              seen.add(val);
            }
            if (typeof replacer === 'function') {
              return replacer.call(this, key, val);
            }
            return val;
          },
          space
        );
      }
      throw err;
    }
  };
}

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
