import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { GlobalErrorBoundary } from './components/GlobalErrorBoundary';

// Global uncaught error suppressor for non-fatal runtime warnings
if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (event) => {
    // Avoid noisy blank crashes for background fetch/chunk aborts
    if (event.reason === undefined || event.reason === null || event.reason === "") {
      event.preventDefault();
      return;
    }
  });

  window.addEventListener("error", (event) => {
    if (!event.message || event.message === "Uncaught " || event.message === "Script error.") {
      event.preventDefault();
      return;
    }
  });
}

// Register service worker for official phone notifications and PWA
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((e) => {
      console.warn("SW register warning:", e);
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GlobalErrorBoundary>
      <App />
    </GlobalErrorBoundary>
  </StrictMode>,
);

