import './index.css'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { PriceCacheProvider } from './context/PriceCacheContext'

// DEBUG: console.log("[APP BOOT] PriceCacheProvider mounting");

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PriceCacheProvider>
      <App />
    </PriceCacheProvider>
  </React.StrictMode>,
)
