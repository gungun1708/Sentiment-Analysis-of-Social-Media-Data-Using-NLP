import { useEffect } from 'react'
import { Check, X } from 'lucide-react'

export default function Toast({ message, onClose }) {
  useEffect(() => {
    if (!message) return undefined
    const timeout = window.setTimeout(onClose, 3600)
    return () => window.clearTimeout(timeout)
  }, [message, onClose])
  if (!message) return null
  return <div className="toast" role="status"><span><Check size={14} /></span>{message}<button onClick={onClose} aria-label="Dismiss notification"><X size={14} /></button></div>
}
