import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

// Comparison frames (#looks) are scaled; fixed backgrounds misrender there.
if (window.self !== window.top) document.documentElement.classList.add('in-frame');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
