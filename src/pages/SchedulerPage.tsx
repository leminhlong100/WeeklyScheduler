import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from '@/features/i18n/LocaleContext'
import { useTheme } from '@/features/theme/ThemeContext'
import { ThemePickerModal } from '@/features/theme/components/ThemePickerModal'
import { useProfilePreferenceSync } from '@/features/profile/hooks/useProfilePreferenceSync'
import { UserMenu } from '@/features/profile/components/UserMenu'
import { useWeekAnchor } from '@/features/calendar-nav/hooks/useWeekAnchor'
import { MiniCalendar } from '@/features/calendar-nav/components/MiniCalendar'
import { formatWeekRange } from '@/features/calendar-nav/utils/formatWeekRange'
import { useCategories } from '@/features/categories/hooks/useCategories'
import { useActiveCategoryFilter } from '@/features/categories/hooks/useActiveCategoryFilter'
import { CategoryManagerModal } from '@/features/categories/components/CategoryManagerModal'
import { useTasksForWeek } from '@/features/tasks/hooks/useTasksForWeek'
import { WeekGrid } from '@/features/tasks/components/WeekGrid'
import { TaskFormModal, type TaskDraft } from '@/features/tasks/components/TaskFormModal'
import { StickersOverlay } from '@/features/stickers/components/StickersOverlay'
import { AppShell } from '@/features/layout/components/AppShell'
import { Header } from '@/features/layout/components/Header'
import { Sidebar, type CategorySidebarItem } from '@/features/layout/components/Sidebar'
import { addDays, toISODate } from '@/lib/utils/date'

export function SchedulerPage() {
  useProfilePreferenceSync()

  const { t, locale, setLocale } = useTranslation()
  const { theme } = useTheme()
  const {
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
  } = useWeekAnchor()

  const { data: categories = [] } = useCategories()
  const { isActive, toggle } = useActiveCategoryFilter()
  const { data: tasks = [] } = useTasksForWeek(weekStart)

  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [themePickerOpen, setThemePickerOpen] = useState(false)
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false)
  const [taskDraft, setTaskDraft] = useState<TaskDraft | null>(null)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setThemePickerOpen(false)
      setCategoryManagerOpen(false)
      setTaskDraft(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const weekStartISO = toISODate(weekStart)
  const weekRangeLabel = formatWeekRange(locale, t, weekStart, addDays(weekStart, 6))

  const sidebarCategories = useMemo<CategorySidebarItem[]>(
    () =>
      categories.map((category) => ({
        id: category.id,
        emoji: category.emoji,
        label: category.name,
        color: category.color,
        count: tasks.filter((task) => task.category_id === category.id).length,
        active: isActive(category.id),
      })),
    [categories, tasks, isActive],
  )

  const openNewEventFromHeader = () => {
    const todayISO = toISODate(new Date())
    const taskDate = todayISO >= weekStartISO ? todayISO : weekStartISO
    setTaskDraft({ taskDate, startMinute: 540 })
  }

  return (
    <AppShell
      theme={theme}
      sidebar={
        <Sidebar
          open={sidebarOpen}
          theme={theme}
          t={t}
          locale={locale}
          onLocaleChange={setLocale}
          categories={sidebarCategories}
          onToggleCategory={toggle}
          onManageCategories={() => setCategoryManagerOpen(true)}
          miniCalendar={
            <MiniCalendar
              locale={locale}
              t={t}
              theme={theme}
              year={miniYear}
              month={miniMonth}
              weekStart={weekStart}
              selected={selected}
              onPrevMonth={miniPrevMonth}
              onNextMonth={miniNextMonth}
              onPickDay={pickDay}
            />
          }
        />
      }
      header={
        <Header
          theme={theme}
          t={t}
          weekRangeLabel={weekRangeLabel}
          currentThemeName={theme.name[locale]}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
          onPrevWeek={prevWeek}
          onNextWeek={nextWeek}
          onToday={goToday}
          onOpenTheme={() => setThemePickerOpen(true)}
          onNewEvent={openNewEventFromHeader}
          userMenu={<UserMenu />}
        />
      }
    >
      <StickersOverlay t={t} theme={theme}>
        <WeekGrid
          weekStart={weekStart}
          tasks={tasks}
          categories={categories}
          isCategoryActive={isActive}
          theme={theme}
          t={t}
          onRequestCreate={(taskDate, startMinute) => setTaskDraft({ taskDate, startMinute })}
          onRequestEdit={(taskId) => {
            const task = tasks.find((tk) => tk.id === taskId)
            if (!task) return
            setTaskDraft({ task, taskDate: task.task_date, startMinute: task.start_minute })
          }}
        />
      </StickersOverlay>

      <TaskFormModal draft={taskDraft} weekStartISO={weekStartISO} onClose={() => setTaskDraft(null)} />
      <ThemePickerModal open={themePickerOpen} onOpenChange={setThemePickerOpen} />
      <CategoryManagerModal open={categoryManagerOpen} onOpenChange={setCategoryManagerOpen} />
    </AppShell>
  )
}
