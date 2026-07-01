import { Loader2Icon } from 'lucide-react'

export function FullScreenSpinner() {
  return (
    <div className="grid min-h-screen w-full place-items-center">
      <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
    </div>
  )
}
