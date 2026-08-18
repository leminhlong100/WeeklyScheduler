import { useId, useRef, useState, type DragEvent } from 'react'
import { ImagePlus, Loader2, X } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { FieldColors } from './fieldColors'

interface ImageDropFieldProps {
  label: string
  /** Preview URL — a `blob:` while local, a remote URL once uploaded. */
  value: string | null
  onPick: (file: File) => void
  onClear: () => void
  colors: FieldColors
  busy?: boolean
  hint?: string
  error?: string
  clearLabel?: string
  /** CSS `aspect-ratio` for the drop zone, so it previews at the real shape. */
  aspect?: string
  className?: string
}

/** Drop zone / file picker for one image, showing the picked image in place. */
export function ImageDropField({
  label,
  value,
  onPick,
  onClear,
  colors,
  busy = false,
  hint,
  error,
  clearLabel,
  aspect = '16 / 9',
  className,
}: ImageDropFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const inputId = useId()

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    const file = event.dataTransfer.files?.[0]
    if (file?.type.startsWith('image/')) onPick(file)
  }

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={inputId} className="text-[11px] font-extrabold" style={{ color: colors.muted }}>
          {label}
        </label>
        {value && !busy && (
          <button
            type="button"
            onClick={onClear}
            aria-label={clearLabel}
            title={clearLabel}
            className="grid size-5 place-items-center rounded-md"
            style={{ color: colors.muted }}
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      <div
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className="relative grid w-full place-items-center overflow-hidden rounded-[14px] border-[1.5px] border-dashed transition-colors"
        style={{
          aspectRatio: aspect,
          borderColor: error ? '#ff5d7a' : dragging ? colors.accent : colors.border,
          background: value ? colors.chip : colors.inputBg,
          // The preview is the field: judging a background at thumbnail size is
          // guesswork, so show as much of it as the panel width allows.
          backgroundImage: value ? `url("${encodeURI(value)}")` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) onPick(file)
            // Reset so re-picking the same file fires change again.
            event.target.value = ''
          }}
        />

        {busy ? (
          <Loader2 className="size-6 animate-spin" style={{ color: colors.accent }} />
        ) : (
          !value && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex flex-col items-center gap-1 px-3 py-4 text-center"
              style={{ color: colors.muted }}
            >
              <ImagePlus className="size-5" />
              {hint && <span className="text-[11px] font-bold leading-snug">{hint}</span>}
            </button>
          )
        )}

        {value && !busy && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="absolute inset-0"
            aria-label={label}
          />
        )}
      </div>

      {error && <p className="text-[11px] font-bold text-[#ff5d7a]">{error}</p>}
    </div>
  )
}
