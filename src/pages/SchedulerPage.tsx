import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useIsMobile } from '@/hooks/useMediaQuery'
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
import { useCopyPreviousWeek } from '@/features/tasks/hooks/useTaskMutations'
import { WeekGrid } from '@/features/tasks/components/WeekGrid'
import { TaskFormModal, type TaskDraft } from '@/features/tasks/components/TaskFormModal'
import { StickersOverlay } from '@/features/stickers/components/StickersOverlay'
import { IosInstallBanner } from '@/features/pwa/IosInstallBanner'
import { AppShell } from '@/features/layout/components/AppShell'
import { Header } from '@/features/layout/components/Header'
import { MobileActionBar } from '@/features/layout/components/MobileActionBar'
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
  const copyPreviousWeek = useCopyPreviousWeek(weekStart)

  const isMobile = useIsMobile()
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile)
  const [themePickerOpen, setThemePickerOpen] = useState(false)
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false)
  const [taskDraft, setTaskDraft] = useState<TaskDraft | null>(null)
  const [stickerTrayOpen, setStickerTrayOpen] = useState(false)
  const [stickerEditMode, setStickerEditMode] = useState(false)

  // The sidebar behaves as a push panel on desktop but an off-canvas drawer
  // on mobile — flip its default open state whenever the breakpoint changes
  // (e.g. device rotation) so it isn't left covering the screen or hidden.
  // Adjusted during render (not an effect) per React's guidance for state
  // that depends on a prop change, to avoid an extra committed render.
  const [prevIsMobile, setPrevIsMobile] = useState(isMobile)
  if (isMobile !== prevIsMobile) {
    setPrevIsMobile(isMobile)
    setSidebarOpen(!isMobile)
  }

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

  const handlePickDay = (iso: string) => {
    pickDay(iso)
    if (isMobile) setSidebarOpen(false)
  }

  const openNewEventFromHeader = () => {
    const todayISO = toISODate(new Date())
    const taskDate = todayISO >= weekStartISO ? todayISO : weekStartISO
    setTaskDraft({ taskDate, startMinute: 540 })
  }

  const handleSwipeDay = (direction: 1 | -1) => {
    pickDay(toISODate(addDays(selected, direction)))
  }

  // Single merged sticker toggle (mobile "..." menu item and desktop's
  // floating button both use this): catalog and edit mode move together.
  // Driven off "is either currently on" rather than just `stickerTrayOpen` —
  // closing the catalog via its own X leaves edit mode on (on purpose, so an
  // in-progress rearrange isn't interrupted), and reading trayOpen alone
  // would make this button reopen the catalog instead of turning edit mode
  // off in that state.
  const stickerPanelActive = stickerTrayOpen || stickerEditMode
  const toggleStickerPanel = () => {
    const next = !stickerPanelActive
    setStickerTrayOpen(next)
    setStickerEditMode(next)
  }
  const closeStickerTray = () => setStickerTrayOpen(false)

  const handleCopyLastWeek = () => {
    copyPreviousWeek.mutate(undefined, {
      onSuccess: (created) => {
        if (created.length === 0) toast(t.noTasksLastWeek)
        else toast.success(t.weekCopied)
      },
      onError: () => toast.error(t.somethingWentWrong),
    })
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
          onClose={() => setSidebarOpen(false)}
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
              onPickDay={handlePickDay}
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
          onCopyLastWeek={handleCopyLastWeek}
          copyLastWeekPending={copyPreviousWeek.isPending}
          userMenu={<UserMenu />}
        />
      }
      bottomBar={
        <MobileActionBar
          theme={theme}
          t={t}
          currentThemeName={theme.name[locale]}
          onPrevWeek={prevWeek}
          onNextWeek={nextWeek}
          onToday={goToday}
          onOpenTheme={() => setThemePickerOpen(true)}
          onNewEvent={openNewEventFromHeader}
          onCopyLastWeek={handleCopyLastWeek}
          copyLastWeekPending={copyPreviousWeek.isPending}
          onToggleStickerPanel={toggleStickerPanel}
        />
      }
    >
      <IosInstallBanner />
      <StickersOverlay
        t={t}
        theme={theme}
        editMode={stickerEditMode}
        trayOpen={stickerTrayOpen}
        onCloseTray={closeStickerTray}
        onToggleDesktopPanel={toggleStickerPanel}
      >
        <WeekGrid
          weekStart={weekStart}
          selected={selected}
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
          onSwipeDay={handleSwipeDay}
        />
      </StickersOverlay>

      <TaskFormModal draft={taskDraft} weekStartISO={weekStartISO} onClose={() => setTaskDraft(null)} />
      <ThemePickerModal open={themePickerOpen} onOpenChange={setThemePickerOpen} />
      <CategoryManagerModal open={categoryManagerOpen} onOpenChange={setCategoryManagerOpen} />
    </AppShell>
  )
}
