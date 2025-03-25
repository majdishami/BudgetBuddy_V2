import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Debug: Log environment variables
console.log('Environment Variables:', import.meta.env);

const container = document.getElementById('root');
const root = createRoot(container!); // Use createRoot instead of ReactDOM.render

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);