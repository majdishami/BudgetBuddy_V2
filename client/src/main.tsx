import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css'; // Import the CSS file
import App from './App';

// Create a root container
const container = document.getElementById('root');
const root = createRoot(container!); // Use createRoot with the container

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);