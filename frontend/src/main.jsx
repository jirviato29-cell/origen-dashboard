import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// PWA: cuando se publica una versión nueva, el service worker se actualiza solo
// (skipWaiting + clientsClaim en src/sw.js), pero la pestaña abierta seguiría
// mostrando los archivos viejos hasta recargar a mano. Aquí recargamos UNA vez
// en cuanto el SW nuevo toma control, para que los cambios se vean sin tener que
// refrescar dos veces. Guard: solo si YA había un SW controlando (una
// actualización real), no en la primera visita (cuando clientsClaim reclama por
// primera vez), para no recargar de más.
if ('serviceWorker' in navigator) {
  const hadController = !!navigator.serviceWorker.controller;
  let recargando = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || recargando) return;
    recargando = true;
    window.location.reload();
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
