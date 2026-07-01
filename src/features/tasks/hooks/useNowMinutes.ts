import { useEffect, useState } from 'react'
import { minutesNow } from '@/lib/utils/date'

/** Current minute-of-day, refreshed every minute — drives the "now" grid line. */
export function useNowMinutes(): number {
  const [now, setNow] = useState(minutesNow)

  useEffect(() => {
    const interval = setInterval(() => setNow(minutesNow()), 60_000)
    return () => clearInterval(interval)
  }, [])

  return now
}
