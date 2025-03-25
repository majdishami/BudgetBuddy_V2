import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import './index.css';

// Debug: Log environment variables
console.log('Environment Variables:', import.meta.env);

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);