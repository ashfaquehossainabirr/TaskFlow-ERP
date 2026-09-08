import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { TimerProvider } from './context/TimerContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import './index.css';
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <TimerProvider>
            <App />
          </TimerProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);

// Dismiss the pre-React boot splash (see index.html) once the app has mounted
// and painted. The double rAF ensures the first real frame is on screen
// before we fade the splash out, so there's no gap or flash between them.
const dismissBootSplash = () => {
  const boot = document.getElementById('tf-boot');
  if (!boot) return;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      boot.classList.add('tf-boot-hidden');
      setTimeout(() => boot.remove(), 600);
    });
  });
};
dismissBootSplash();
