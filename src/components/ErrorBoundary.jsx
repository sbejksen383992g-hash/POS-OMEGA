import { Component } from 'react'
import { AlertTriangle, RotateCcw, Home } from 'lucide-react'

// Catches render/runtime errors anywhere in the tree below it so a bug
// on one page shows a recoverable message instead of a blank white
// screen. Does not swallow errors silently — logs to console so
// issues are still visible during development.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('POS crashed:', error, info)
  }

  handleReload = () => {
    this.setState({ error: null })
    window.location.reload()
  }

  handleHome = () => {
    this.setState({ error: null })
    window.location.hash = '#/'
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="card p-8 max-w-md w-full text-center">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--accent-soft)' }}>
            <AlertTriangle size={26} className="accent-text" />
          </div>
          <h1 className="text-lg font-display font-bold mb-2">Something went wrong</h1>
          <p className="text-sm text-text-secondary mb-6">
            POS hit an unexpected error on this screen. Your progress is safely stored — reloading or
            returning to the Dashboard should get you back on track.
          </p>
          <details className="text-left mb-6">
            <summary className="text-xs text-text-tertiary cursor-pointer hover:text-text-secondary transition-colors">
              Technical details
            </summary>
            <pre className="text-[10px] text-text-tertiary mt-2 p-3 rounded-lg bg-bg-700/50 overflow-x-auto whitespace-pre-wrap">
              {String(this.state.error?.message || this.state.error)}
            </pre>
          </details>
          <div className="flex items-center justify-center gap-3">
            <button onClick={this.handleHome} className="btn-ghost text-sm">
              <Home size={14} /> Dashboard
            </button>
            <button onClick={this.handleReload} className="btn-primary text-sm">
              <RotateCcw size={14} /> Reload
            </button>
          </div>
        </div>
      </div>
    )
  }
}

// Non-critical subsystems (voice announcer, alarms, FX, native bridges) must never take the whole
// app down: if one throws it is logged and simply not rendered.
export class SilentBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { failed: false }
  }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error, info) {
    console.error(`[APEX] ${this.props.name || 'subsystem'} failed and was isolated:`, error, info?.componentStack)
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
}
