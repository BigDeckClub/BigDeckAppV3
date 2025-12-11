import './index.css'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { PriceCacheProvider } from './context/PriceCacheContext'
import { ThemeProvider } from './context/ThemeContext'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <PriceCacheProvider>
        <App />
      </PriceCacheProvider>
    </ThemeProvider>
  </React.StrictMode>,
)
