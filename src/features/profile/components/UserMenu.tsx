import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DownloadIcon } from 'lucide-react'
import { useTranslation } from '@/features/i18n/LocaleContext'
import { useTheme } from '@/features/theme/ThemeContext'
import { useSignOut } from '@/features/auth/hooks/useAuthMutations'
import { useInstallPrompt } from '@/features/pwa/useInstallPrompt'
import { useProfile } from '../hooks/useProfile'

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : name.slice(0, 2)).toUpperCase()
}

export function UserMenu() {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const { data: profile } = useProfile()
  const signOut = useSignOut()
  const { canInstall, promptInstall } = useInstallPrompt()

  const name = profile?.display_name ?? '…'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        title={name}
        className="relative h-[42px] w-[42px] flex-shrink-0 rounded-full outline-none"
      >
        <Avatar
          className="h-full w-full border-2 font-heading text-[15px] font-extrabold text-white"
          style={{
            borderColor: theme.panel,
            boxShadow: `0 5px 14px ${theme.brandShadow}, 0 0 0 1.5px ${theme.borderStrong}`,
          }}
        >
          {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt={name} />}
          <AvatarFallback style={{ background: theme.brandGrad }} className="text-white">
            {getInitials(name)}
          </AvatarFallback>
        </Avatar>
        <span
          className="absolute right-0 bottom-0 h-[11px] w-[11px] rounded-full border-2"
          style={{ background: '#39d98a', borderColor: theme.panel }}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{name}</DropdownMenuLabel>
        </DropdownMenuGroup>
        {canInstall && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={promptInstall}>
              <DownloadIcon className="size-4" />
              {t.installApp}
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => signOut.mutate(undefined, { onError: () => toast.error(t.somethingWentWrong) })}
        >
          {t.logout}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
