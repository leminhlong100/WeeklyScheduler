import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react'

import { Slider } from '@/components/ui/slider'
import type { FieldColors } from './fieldColors'

/** `null` ratio = the image's own aspect. */
export interface CropAspectOption {
  label: string
  ratio: number | null
}

export interface ImageCropLabels {
  title: string
  hint: string
  zoom: string
  aspect: string
  reset: string
  cancel: string
  apply: string
  failed: string
}

interface ImageCropDialogProps {
  /** The image to crop. A new value restarts the editor. */
  source: Blob
  /** File name for the output; the extension is replaced. */
  fileName?: string
  aspects: CropAspectOption[]
  colors: FieldColors
  labels: ImageCropLabels
  onCancel: () => void
  onConfirm: (file: File) => void
}

const MAX_ZOOM = 6
/** Larger crops are pointless — every theme slot downsizes far below this. */
const MAX_OUTPUT_EDGE = 3200

interface View {
  zoom: number
  /** Offset of the image centre from the frame centre, in frame px. */
  x: number
  y: number
}

const INITIAL_VIEW: View = { zoom: 1, x: 0, y: 0 }

/**
 * Pan / zoom / crop editor for a single image.
 *
 * The frame has the target aspect; the image is scaled to cover it at zoom 1
 * and can never be dragged far enough to expose an empty edge, so whatever the
 * frame shows is exactly what gets exported.
 *
 * Portaled above the theme studio panel (z-80) rather than using the shared
 * dialog, whose z-50 would land underneath it.
 */
export function ImageCropDialog({
  source,
  fileName = 'image',
  aspects,
  colors,
  labels,
  onCancel,
  onConfirm,
}: ImageCropDialogProps) {
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [aspectIndex, setAspectIndex] = useState(0)
  const [view, setView] = useState<View>(INITIAL_VIEW)
  const [exporting, setExporting] = useState(false)

  const stageRef = useRef<HTMLDivElement>(null)
  const [stage, setStage] = useState({ w: 0, h: 0 })

  // ---- load ---------------------------------------------------------------
  useEffect(() => {
    const url = URL.createObjectURL(source)
    const img = new Image()
    let alive = true
    img.onload = () => alive && setImage(img)
    img.onerror = () => alive && setLoadError(true)
    img.src = url
    return () => {
      alive = false
      URL.revokeObjectURL(url)
    }
  }, [source])

  // ---- measure the stage --------------------------------------------------
  useLayoutEffect(() => {
    const el = stageRef.current
    if (!el) return
    const measure = () => setStage({ w: el.clientWidth, h: el.clientHeight })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // ---- geometry -----------------------------------------------------------
  const iw = image?.naturalWidth ?? 1
  const ih = image?.naturalHeight ?? 1
  const ratio = aspects[aspectIndex]?.ratio ?? iw / ih

  // Largest frame of `ratio` that fits the stage.
  let fw = stage.w
  let fh = stage.w / ratio
  if (fh > stage.h) {
    fh = stage.h
    fw = stage.h * ratio
  }
  const baseScale = Math.max(fw / iw, fh / ih)

  const clamp = useCallback(
    (next: View): View => {
      const zoom = Math.min(MAX_ZOOM, Math.max(1, next.zoom))
      const s = baseScale * zoom
      const maxX = Math.max(0, (iw * s - fw) / 2)
      const maxY = Math.max(0, (ih * s - fh) / 2)
      return {
        zoom,
        x: Math.min(maxX, Math.max(-maxX, next.x)),
        y: Math.min(maxY, Math.max(-maxY, next.y)),
      }
    },
    [baseScale, iw, ih, fw, fh],
  )

  // Stored view may be stale after the frame changes shape (aspect switch,
  // resize); every read goes through the clamp instead of syncing in an effect.
  const shown = clamp(view)

  /** Zoom keeping the image point under `(px, py)` (frame-centre coords) fixed. */
  const zoomAt = useCallback(
    (nextZoom: number, px = 0, py = 0) => {
      setView((v) => {
        const z = Math.min(MAX_ZOOM, Math.max(1, nextZoom))
        const k = z / v.zoom
        return clamp({ zoom: z, x: px - (px - v.x) * k, y: py - (py - v.y) * k })
      })
    },
    [clamp],
  )

  // ---- pointer: drag to pan, two fingers to pinch ------------------------
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef<{ dist: number; zoom: number } | null>(null)

  const frameCoords = (clientX: number, clientY: number) => {
    const rect = stageRef.current!.getBoundingClientRect()
    return { x: clientX - rect.left - rect.width / 2, y: clientY - rect.top - rect.height / 2 }
  }

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom: view.zoom }
    }
  }

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const prev = pointers.current.get(event.pointerId)
    if (!prev) return
    const curr = { x: event.clientX, y: event.clientY }
    pointers.current.set(event.pointerId, curr)

    if (pointers.current.size >= 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()]
      const dist = Math.hypot(a.x - b.x, a.y - b.y)
      const mid = frameCoords((a.x + b.x) / 2, (a.y + b.y) / 2)
      zoomAt(pinch.current.zoom * (dist / Math.max(1, pinch.current.dist)), mid.x, mid.y)
      return
    }
    // Pointer moves are 1:1 with the image, so a drag feels like holding it.
    const dx = curr.x - prev.x
    const dy = curr.y - prev.y
    setView((v) => clamp({ ...v, x: v.x + dx, y: v.y + dy }))
  }

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId)
    if (pointers.current.size < 2) pinch.current = null
  }

  // Native, non-passive listener: React's onWheel can't preventDefault the
  // page scroll behind the overlay.
  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const rect = el.getBoundingClientRect()
      const px = event.clientX - rect.left - rect.width / 2
      const py = event.clientY - rect.top - rect.height / 2
      const factor = Math.exp(-event.deltaY * 0.0015)
      setView((v) => {
        const z = Math.min(MAX_ZOOM, Math.max(1, v.zoom * factor))
        const k = z / v.zoom
        return clamp({ zoom: z, x: px - (px - v.x) * k, y: py - (py - v.y) * k })
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [clamp])

  // ---- keyboard -----------------------------------------------------------
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onCancel()
        return
      }
      const step = event.shiftKey ? 40 : 10
      const moves: Record<string, [number, number]> = {
        ArrowLeft: [step, 0],
        ArrowRight: [-step, 0],
        ArrowUp: [0, step],
        ArrowDown: [0, -step],
      }
      const move = moves[event.key]
      if (move) {
        event.preventDefault()
        setView((v) => clamp({ ...v, x: v.x + move[0], y: v.y + move[1] }))
      } else if (event.key === '+' || event.key === '=') {
        setView((v) => clamp({ ...v, zoom: v.zoom * 1.15 }))
      } else if (event.key === '-') {
        setView((v) => clamp({ ...v, zoom: v.zoom / 1.15 }))
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [clamp, onCancel])

  // ---- export -------------------------------------------------------------
  const apply = async () => {
    if (!image || fw <= 0) return
    setExporting(true)
    try {
      const s = baseScale * shown.zoom
      const sw = fw / s
      const sh = fh / s
      const sx = iw / 2 - (fw / 2 + shown.x) / s
      const sy = ih / 2 - (fh / 2 + shown.y) / s
      const out = Math.min(1, MAX_OUTPUT_EDGE / Math.max(sw, sh))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(sw * out))
      canvas.height = Math.max(1, Math.round(sh * out))
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('no canvas')
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(image, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
      // PNG keeps transparency (character cut-outs); the theme encoder
      // re-compresses to WebP afterwards, so the size here doesn't matter.
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
      if (!blob) throw new Error('encode failed')
      const base = fileName.replace(/\.[^.]+$/, '') || 'image'
      onConfirm(new File([blob], `${base}.png`, { type: 'image/png' }))
    } catch {
      setLoadError(true)
      setExporting(false)
    }
  }

  const s = baseScale * shown.zoom
  const sliderValue = Math.round(shown.zoom * 100)

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-black/55 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onCancel()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={labels.title}
        className="flex max-h-[100dvh] w-full flex-col gap-3 overflow-y-auto rounded-t-[22px] border-[1.5px] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl sm:max-w-[560px] sm:rounded-[22px] sm:pb-4"
        style={{ background: colors.panel, borderColor: colors.border, color: colors.text }}
      >
        <div className="flex flex-col gap-0.5">
          <h2 className="text-[15px] font-extrabold">{labels.title}</h2>
          <p className="text-[11px] font-semibold" style={{ color: colors.mutedText }}>
            {labels.hint}
          </p>
        </div>

        {/* Stage: checkerboard so transparent areas read as transparent. */}
        <div
          ref={stageRef}
          className="relative h-[min(52dvh,380px)] w-full touch-none overflow-hidden rounded-[14px] select-none"
          style={{
            background:
              'repeating-conic-gradient(#8882 0% 25%, transparent 0% 50%) 50% / 16px 16px',
            cursor: image ? 'grab' : 'default',
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onDoubleClick={(event) => {
            const p = frameCoords(event.clientX, event.clientY)
            zoomAt(view.zoom < 2 ? view.zoom * 2 : 1, p.x, p.y)
          }}
        >
          {image ? (
            <>
              <img
                src={image.src}
                alt=""
                draggable={false}
                className="pointer-events-none absolute top-1/2 left-1/2 max-w-none"
                style={{
                  width: iw * s,
                  height: ih * s,
                  transform: `translate(calc(-50% + ${shown.x}px), calc(-50% + ${shown.y}px))`,
                }}
              />
              {/* Crop frame: everything outside is dimmed by the huge shadow. */}
              <div
                className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-[2px]"
                style={{
                  width: fw,
                  height: fh,
                  boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
                  outline: '2px solid rgba(255,255,255,0.95)',
                  backgroundImage:
                    'linear-gradient(to right, transparent calc(33.33% - 0.5px), rgba(255,255,255,0.35) calc(33.33% - 0.5px) calc(33.33% + 0.5px), transparent calc(33.33% + 0.5px) calc(66.66% - 0.5px), rgba(255,255,255,0.35) calc(66.66% - 0.5px) calc(66.66% + 0.5px), transparent calc(66.66% + 0.5px)), linear-gradient(to bottom, transparent calc(33.33% - 0.5px), rgba(255,255,255,0.35) calc(33.33% - 0.5px) calc(33.33% + 0.5px), transparent calc(33.33% + 0.5px) calc(66.66% - 0.5px), rgba(255,255,255,0.35) calc(66.66% - 0.5px) calc(66.66% + 0.5px), transparent calc(66.66% + 0.5px))',
                }}
              />
            </>
          ) : (
            <div className="grid h-full place-items-center">
              {loadError ? (
                <span className="text-[12px] font-bold text-[#ff5d7a]">{labels.failed}</span>
              ) : (
                <Loader2 className="size-6 animate-spin" style={{ color: colors.accentText }} />
              )}
            </div>
          )}
        </div>

        {aspects.length > 1 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-extrabold" style={{ color: colors.mutedText }}>
              {labels.aspect}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {aspects.map((option, index) => {
                const active = index === aspectIndex
                return (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => setAspectIndex(index)}
                    className="rounded-full border-[1.5px] px-3 py-1 text-[11px] font-extrabold"
                    style={{
                      borderColor: active ? colors.accent : colors.border,
                      background: active ? colors.chip : 'transparent',
                      color: colors.text,
                    }}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between">
            <span className="text-[11px] font-extrabold" style={{ color: colors.mutedText }}>
              {labels.zoom}
            </span>
            <span className="font-mono text-[10px] font-bold tabular-nums" style={{ color: colors.mutedText }}>
              {sliderValue}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => zoomAt(view.zoom / 1.25)}
              aria-label={`${labels.zoom} -`}
              className="grid size-7 shrink-0 place-items-center rounded-md"
              style={{ color: colors.mutedText }}
            >
              <ZoomOut className="size-4" />
            </button>
            <div className="min-w-0 flex-1">
              <Slider
                value={sliderValue}
                min={100}
                max={MAX_ZOOM * 100}
                step={1}
                onValueChange={(next) => zoomAt((typeof next === 'number' ? next : next[0]) / 100)}
                trackColor={colors.border}
                rangeColor={colors.accent}
                aria-label={labels.zoom}
              />
            </div>
            <button
              type="button"
              onClick={() => zoomAt(view.zoom * 1.25)}
              aria-label={`${labels.zoom} +`}
              className="grid size-7 shrink-0 place-items-center rounded-md"
              style={{ color: colors.mutedText }}
            >
              <ZoomIn className="size-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => setView(INITIAL_VIEW)}
            className="flex h-9 items-center gap-1.5 rounded-full px-3 text-[12px] font-extrabold"
            style={{ color: colors.mutedText }}
          >
            <RotateCcw className="size-3.5" />
            {labels.reset}
          </button>
          <span className="flex-1" />
          <button
            type="button"
            onClick={onCancel}
            className="h-9 rounded-full border-[1.5px] px-4 text-[12px] font-extrabold"
            style={{ borderColor: colors.border, color: colors.text }}
          >
            {labels.cancel}
          </button>
          <button
            type="button"
            disabled={!image || exporting}
            onClick={() => void apply()}
            className="flex h-9 items-center gap-1.5 rounded-full px-4 text-[12px] font-extrabold disabled:opacity-50"
            style={{ background: colors.accentFill, color: colors.onAccent }}
          >
            {exporting && <Loader2 className="size-3.5 animate-spin" />}
            {labels.apply}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
