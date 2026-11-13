import { useProfile } from '@/features/profile/hooks/useProfile'
import { useUpdateProfile } from '@/features/profile/hooks/useUpdateProfile'
import { normalizeCycleStartDay } from '../utils/month'

/**
 * Ngày bắt đầu kỳ hạn mức của người dùng (1–28). Lưu ở `profiles` để điện
 * thoại và máy tính cùng một kỳ. Đang lưu thì trả luôn giá trị vừa chọn để ô
 * chọn không nháy về giá trị cũ.
 */
export function useBudgetCycleStartDay() {
  const { data: profile } = useProfile()
  const update = useUpdateProfile()
  const pending = update.isPending ? update.variables?.budget_cycle_start_day : undefined
  const startDay = normalizeCycleStartDay(pending ?? profile?.budget_cycle_start_day)
  const setStartDay = (day: number) => {
    const next = normalizeCycleStartDay(day)
    if (next !== startDay) update.mutate({ budget_cycle_start_day: next })
  }
  return { startDay, setStartDay, saving: update.isPending }
}
