import { createRoot } from 'react-dom/client';
import '@fontsource/archivo-black';
import './styles.css';
import App from './App.jsx';

if (import.meta.env.DEV) {
  window.__errs = [];
  window.addEventListener('error', (e) =>
    window.__errs.push(`${e.message}\n${e.error?.stack?.slice(0, 700) || 'no stack'}`),
  );
  window.addEventListener('unhandledrejection', (e) =>
    window.__errs.push(`rej: ${String(e.reason?.message || e.reason)}`),
  );
  const orig = console.error;
  console.error = (...a) => {
    const msg = a.map(String).join(' ').slice(0, 400);
    if (!msg.includes('THREE.WebGLRenderer')) window.__errs.push(msg);
    orig(...a);
  };
}

createRoot(document.getElementById('root')).render(<App />);
