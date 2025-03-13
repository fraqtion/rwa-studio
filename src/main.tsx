import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
//import { ThemeProvider } from '@material-tailwind/react';
import './index.css';
import App from './App.tsx';
import { initCleanupListener } from './common/utils/cleanupUtils';

// Initialize the cleanup event listener
initCleanupListener();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
