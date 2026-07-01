interface NowIndicatorProps {
  topPx: number
  color: string
}

export function NowIndicator({ topPx, color }: NowIndicatorProps) {
  return (
    <div
      className="pointer-events-none absolute right-0 left-0 z-20 h-0.5"
      style={{ top: topPx, background: color }}
    >
      <div
        className="absolute -top-[3px] -left-1 h-2 w-2 rounded-full"
        style={{ background: color }}
      />
    </div>
  )
}
