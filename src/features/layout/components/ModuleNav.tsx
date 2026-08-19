import { CalendarDaysIcon, WalletIcon } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import type { Dictionary } from '@/features/i18n/dictionary'
import { cn } from '@/lib/utils'

interface ModuleNavProps {
  t: Dictionary
  /** Đóng thanh bên sau khi chuyển trang trên mobile, nơi nó phủ toàn màn hình. */
  onNavigate?: () => void
}

const ITEMS = [
  { to: '/', label: (t: Dictionary) => t.navScheduler, Icon: CalendarDaysIcon },
  { to: '/expenses', label: (t: Dictionary) => t.navExpenses, Icon: WalletIcon },
] as const

/**
 * Chuyển giữa hai module của app. Nằm trong thanh bên vì đó là chỗ duy nhất có
 * mặt ở mọi trang và mọi bề rộng — trên mobile thanh bên mở bằng nút menu ở
 * Header, nên không cần thêm entry riêng cho `MobileActionBar` (vốn chỉ là
 * thanh công cụ của trang lịch tuần).
 */
export function ModuleNav({ t, onNavigate }: ModuleNavProps) {
  return (
    <nav className="flex gap-1.5 rounded-2xl bg-white/13 p-1">
      {ITEMS.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          end
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-[12.5px] font-bold transition-colors',
              isActive ? 'bg-white/90 text-slate-800' : 'text-white/85 hover:bg-white/10',
            )
          }
        >
          <Icon className="size-4 flex-shrink-0" />
          <span className="truncate">{label(t)}</span>
        </NavLink>
      ))}
    </nav>
  )
}
