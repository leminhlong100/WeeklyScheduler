import { Switch as SwitchPrimitive } from '@base-ui/react/switch'

import { cn } from '@/lib/utils'

interface SwitchProps extends SwitchPrimitive.Root.Props {
  /** Track colour when on. */
  onColor?: string
  /** Track colour when off. */
  offColor?: string
  thumbColor?: string
}

export function Switch({
  onColor,
  offColor,
  thumbColor,
  className,
  checked,
  ...props
}: SwitchProps) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      checked={checked}
      className={cn(
        'relative inline-flex h-6 w-[42px] shrink-0 items-center rounded-full p-0.5 outline-none transition-colors focus-visible:ring-3 focus-visible:ring-current/30 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      style={{
        background: checked ? (onColor ?? 'var(--color-primary)') : (offColor ?? 'var(--color-border)'),
        color: onColor,
      }}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className="size-5 rounded-full shadow-sm transition-transform data-checked:translate-x-[18px]"
        style={{ background: thumbColor ?? '#ffffff' }}
      />
    </SwitchPrimitive.Root>
  )
}
