import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import App from './App.jsx'
import MotionProvider from './motion/MotionProvider.jsx'
import AppLock from './components/AppLock.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import './index.css'

const isNative = (() => { try { return Capacitor.isNativePlatform() } catch { return false } })()

// The Android app already ships every file inside the APK. A service worker there only adds a second,
// stale cache that can serve an old shell after an update, so it is removed instead of registered.
if ('serviceWorker' in navigator) {
  if (isNative) {
    navigator.serviceWorker.getRegistrations().then((list) => list.forEach((r) => r.unregister())).catch(() => {})
    if (window.caches?.keys) caches.keys().then((keys) => keys.forEach((k) => caches.delete(k))).catch(() => {})
  } else if (import.meta.env.PROD) {
    window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}))
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <HashRouter>
        <MotionProvider>
          <AppLock>
            <App />
          </AppLock>
        </MotionProvider>
      </HashRouter>
    </ErrorBoundary>
  </React.StrictMode>,
)

// Tell the boot watchdog in index.html that React rendered.
window.requestAnimationFrame(() => { window.__apexBooted = true })
