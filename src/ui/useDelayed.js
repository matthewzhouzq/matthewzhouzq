import { useEffect, useState } from 'react'

// Opens after the camera has had time to fly in; closes immediately.
export function useDelayed(open, delay = 550) {
  const [shown, setShown] = useState(false)
  useEffect(() => {
    if (!open) {
      setShown(false)
      return
    }
    const t = setTimeout(() => setShown(true), delay)
    return () => clearTimeout(t)
  }, [open, delay])
  return shown
}
