import { useState } from 'react'
import dayjs, { type Dayjs } from 'dayjs'
import { addDays, parseISODate, startOfWeekMonday } from '@/lib/utils/date'

export function useWeekAnchor() {
  const today = dayjs().startOf('day')
  const [weekStart, setWeekStart] = useState<Dayjs>(() => startOfWeekMonday(today))
  const [selected, setSelected] = useState<Dayjs>(today)
  const [miniYear, setMiniYear] = useState(today.year())
  const [miniMonth, setMiniMonth] = useState(today.month())

  const prevWeek = () => setWeekStart((prev) => addDays(prev, -7))
  const nextWeek = () => setWeekStart((prev) => addDays(prev, 7))

  const goToday = () => {
    const now = dayjs().startOf('day')
    setWeekStart(startOfWeekMonday(now))
    setSelected(now)
    setMiniYear(now.year())
    setMiniMonth(now.month())
  }

  const pickDay = (iso: string) => {
    const date = parseISODate(iso)
    setSelected(date)
    setWeekStart(startOfWeekMonday(date))
    setMiniYear(date.year())
    setMiniMonth(date.month())
  }

  const miniPrevMonth = () => {
    setMiniMonth((m) => {
      if (m === 0) {
        setMiniYear((y) => y - 1)
        return 11
      }
      return m - 1
    })
  }

  const miniNextMonth = () => {
    setMiniMonth((m) => {
      if (m === 11) {
        setMiniYear((y) => y + 1)
        return 0
      }
      return m + 1
    })
  }

  return {
    weekStart,
    selected,
    miniYear,
    miniMonth,
    prevWeek,
    nextWeek,
    goToday,
    pickDay,
    miniPrevMonth,
    miniNextMonth,
  }
}
