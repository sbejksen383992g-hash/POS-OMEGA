import { useCallback, useEffect, useState } from 'react'
import { MessageSquare, Users, Layers, ShieldCheck, RefreshCw } from 'lucide-react'
import { useStore } from '../store/useStore'
import { getAutomationStatus, requestContacts, openAccessibilitySettings, openOverlaySettings } from '../utils/nexusAutomation'

const Pill = ({ ok }) => <span className={`text-[10px] font-semibold ${ok ? 'accent-text' : 'text-text-tertiary'}`}>{ok ? 'ON' : 'OFF'}</span>

export default function NexusAutomationCard() {
  const settings = useStore((s) => s.settings)
  const updateSettings = useStore((s) => s.updateSettings)
  const [status, setStatus] = useState({ native: false })
  const [contacts, setContacts] = useState(null)
  const [cc, setCc] = useState(() => { try { return localStorage.getItem('nexus-default-country') || '91' } catch { return '91' } })

  const refresh = useCallback(async () => setStatus(await getAutomationStatus()), [])
  useEffect(() => {
    void refresh()
    const onFocus = () => { void refresh() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => { window.removeEventListener('focus', onFocus); document.removeEventListener('visibilitychange', onFocus) }
  }, [refresh])

  if (!status.native) return null
  const lockOn = settings.nexusSensitiveLock !== false

  return (
    <div className="rounded-2xl border border-accent/20 bg-accent/5 p-4 space-y-3">
      <div>
        <p className="text-xs font-semibold flex items-center gap-2"><MessageSquare size={13} className="accent-text" /> Nexus automation</p>
        <p className="text-[10px] text-text-tertiary mt-1">Lets Nexus find contacts, press Send in WhatsApp, delete your last message, and wake from the background.</p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0"><p className="text-xs flex items-center gap-2"><ShieldCheck size={12} /> Lock risky actions</p><p className="text-[10px] text-text-tertiary">Sending/deleting messages, calls and SMS need your fingerprint or screen lock.</p></div>
        <button className={`btn-ghost text-xs shrink-0 ${lockOn ? 'accent-text' : ''}`} onClick={() => updateSettings({ nexusSensitiveLock: !lockOn })}>{lockOn ? 'On' : 'Off'}</button>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0"><p className="text-xs flex items-center gap-2"><MessageSquare size={12} /> WhatsApp automation <Pill ok={status.accessibility} /></p><p className="text-[10px] text-text-tertiary">Accessibility → “Nexus WhatsApp automation” → On. Only watches WhatsApp, only after you ask.</p></div>
        <button className="btn-ghost text-xs shrink-0" onClick={openAccessibilitySettings}>{status.accessibility ? 'Manage' : 'Enable'}</button>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0"><p className="text-xs flex items-center gap-2"><Users size={12} /> Contacts {contacts !== null && <Pill ok={contacts} />}</p><p className="text-[10px] text-text-tertiary">Needed to resolve “message Rohan”.</p></div>
        <button className="btn-ghost text-xs shrink-0" onClick={async () => setContacts(await requestContacts())}>Allow</button>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0"><p className="text-xs flex items-center gap-2"><Layers size={12} /> Display over other apps <Pill ok={status.overlay} /></p><p className="text-[10px] text-text-tertiary">Lets “Nexus” open the assistant from the background or a dark screen.</p></div>
        <button className="btn-ghost text-xs shrink-0" onClick={openOverlaySettings}>{status.overlay ? 'Manage' : 'Allow'}</button>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs">Default country code for 10-digit numbers</p>
        <input className="input-field !min-h-[36px] w-20 text-center" inputMode="numeric" value={cc} onChange={(e) => { const v = e.target.value.replace(/\D/g, '').slice(0, 4); setCc(v); try { localStorage.setItem('nexus-default-country', v || '91') } catch { /* optional */ } }} />
      </div>
      <button className="btn-ghost text-[11px]" onClick={refresh}><RefreshCw size={11} /> Refresh status</button>
    </div>
  )
}
