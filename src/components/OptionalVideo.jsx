import { useEffect, useMemo, useState } from 'react'

/**
 * Video is desktop-only. Touch devices get a static poster/background so Android
 * WebView never has to decode a looping media layer during scrolling.
 */
export default function OptionalVideo({ src, poster, className = '', ariaHidden = true }) {
  const [failed, setFailed] = useState(false)
  const isTouch = typeof window !== 'undefined' && (window.matchMedia?.('(pointer: coarse)').matches || window.innerWidth <= 900)
  const fallbackStyle = useMemo(() => poster ? { backgroundImage: `url(${poster})` } : undefined, [poster])

  useEffect(() => {
    if (isTouch) setFailed(false)
  }, [isTouch])

  if (failed || !src || isTouch) {
    return poster ? <div className={className} style={{ ...fallbackStyle, backgroundColor: '#070b14', backgroundSize: 'cover', backgroundPosition: 'center' }} aria-hidden={ariaHidden} /> : null
  }

  return (
    <video
      className={className}
      src={src}
      poster={poster}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      aria-hidden={ariaHidden}
      onError={() => setFailed(true)}
    />
  )
}
