import { relativeLuminance } from './color'

/**
 * Client-side encode for theme artwork.
 *
 * A separate path from `imageFile.ts` rather than a reuse of it:
 * `readImageFileAsSticker` returns a PNG data URL, and a 1920x1080 backdrop as
 * base64 PNG is 4-6 MB — fine for a 64px sticker, hopeless for a background that
 * has to travel to Storage and back on every cold load.
 */

export type ThemeImageKind = 'scene' | 'sideScene' | 'figure'

interface KindSpec {
  /** Contain box. Images are only ever scaled down. */
  box: { w: number; h: number }
  quality: number
  /** Composite onto the page background instead of keeping transparency. */
  flatten: boolean
  /** Crop away fully transparent edges before letterboxing. */
  trim: boolean
  /** Above this, re-encode harder. */
  soft: number
  /** Above this after all retries, reject. */
  hard: number
  /** Below this the result will visibly blur when scaled up. */
  minEdge: number
  /** Which dimension `minEdge` applies to. */
  minEdgeAxis: 'w' | 'h' | 'max'
}

const SPECS: Record<ThemeImageKind, KindSpec> = {
  scene: {
    box: { w: 1920, h: 1080 },
    quality: 0.82,
    flatten: true,
    trim: false,
    soft: 260 * 1024,
    hard: 500 * 1024,
    minEdge: 960,
    minEdgeAxis: 'w',
  },
  sideScene: {
    box: { w: 660, h: 1600 },
    quality: 0.82,
    flatten: true,
    trim: false,
    soft: 190 * 1024,
    hard: 380 * 1024,
    minEdge: 800,
    minEdgeAxis: 'h',
  },
  figure: {
    box: { w: 512, h: 512 },
    // Higher than the backdrops: a character sits at full opacity in the
    // foreground, where WebP ringing around hard cut-out edges is visible.
    quality: 0.9,
    flatten: false,
    trim: true,
    soft: 110 * 1024,
    hard: 220 * 1024,
    minEdge: 192,
    minEdgeAxis: 'max',
  },
}

const MAX_ATTEMPTS = 3
const OUTPUT_MIME = 'image/webp'

export interface PreparedThemeImage {
  blob: Blob
  mime: string
  w: number
  h: number
  bytes: number
  /** Darkest cell of a coarse grid — feeds the scene contrast check. */
  darkestCell: string
  lightestCell: string
  hasAlpha: boolean
  /** Dictionary key for a non-blocking warning, if one applies. */
  warning?: string
}

/** Rejections carry a dictionary key so the caller can translate them. */
export class ThemeImageError extends Error {
  readonly key: string
  readonly params?: Record<string, string | number>

  constructor(key: string, params?: Record<string, string | number>) {
    super(key)
    this.name = 'ThemeImageError'
    this.key = key
    this.params = params
  }
}

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(w))
  canvas.height = Math.max(1, Math.round(h))
  return canvas
}

function context(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new ThemeImageError('themeImageFailed')
  return ctx
}

async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file)
    } catch {
      // Fall through to the <img> path — some encoders (notably progressive
      // JPEG variants) decode there but not through createImageBitmap.
    }
  }
  const url = URL.createObjectURL(file)
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new ThemeImageError('themeImageFailed'))
      img.src = url
    })
  } finally {
    // Safe immediately: decoding has finished by the time the promise settles.
    URL.revokeObjectURL(url)
  }
}

function sizeOf(source: ImageBitmap | HTMLImageElement): { w: number; h: number } {
  return source instanceof HTMLImageElement
    ? { w: source.naturalWidth, h: source.naturalHeight }
    : { w: source.width, h: source.height }
}

/** True if any pixel is not fully opaque, sampled on a downscaled copy. */
function detectAlpha(source: ImageBitmap | HTMLImageElement): boolean {
  const { w, h } = sizeOf(source)
  const scale = Math.min(1, 128 / Math.max(w, h))
  const canvas = makeCanvas(w * scale, h * scale)
  const ctx = context(canvas)
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height)
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 250) return true
  }
  return false
}

/**
 * Bounding box of the non-transparent pixels.
 *
 * This is the highest-leverage step for figures. `ThemeArtLayer` anchors them
 * with `center bottom / contain`, so a cut-out exported with 80px of empty canvas
 * under its feet renders *floating* above the grid edge — which reads as a
 * mistake rather than a style. Trimming first makes "stands on the bottom edge"
 * true regardless of how the user exported the file.
 */
function trimAlphaBounds(
  source: ImageBitmap | HTMLImageElement,
): { x: number; y: number; w: number; h: number } {
  const { w, h } = sizeOf(source)
  const canvas = makeCanvas(w, h)
  const ctx = context(canvas)
  ctx.drawImage(source, 0, 0)
  const { data } = ctx.getImageData(0, 0, w, h)

  let minX = w
  let minY = h
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] < 8) continue
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }
  // Fully transparent: nothing to trim, and returning a zero box would divide by
  // zero downstream.
  if (maxX < 0) return { x: 0, y: 0, w, h }
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 }
}

/** Mean colour of each cell of a coarse grid, as hex. */
function cellColors(canvas: HTMLCanvasElement, cols = 6, rows = 4): string[] {
  const small = makeCanvas(cols, rows)
  const ctx = context(small)
  // Downscaling to exactly one pixel per cell makes the browser's own filter do
  // the averaging — cheaper and smoother than summing pixels in JS.
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(canvas, 0, 0, cols, rows)
  const { data } = ctx.getImageData(0, 0, cols, rows)

  const out: string[] = []
  for (let i = 0; i < data.length; i += 4) {
    const hex = `#${[data[i], data[i + 1], data[i + 2]]
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('')}`
    out.push(hex)
  }
  return out
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new ThemeImageError('themeImageFailed'))),
      OUTPUT_MIME,
      quality,
    )
  })
}

/**
 * Decodes, fits, encodes to WebP, and measures one image.
 *
 * `backgroundHex` is only used for the backdrops, which are flattened because
 * they sit behind the grid at partial opacity and transparency there produces
 * unpredictable compositing. Figures keep their alpha — the canvas is never
 * filled for them, since a filled background is exactly what makes a cut-out
 * look like a sticker of a screenshot.
 */
export async function prepareThemeImage(
  file: File,
  kind: ThemeImageKind,
  backgroundHex: string,
): Promise<PreparedThemeImage> {
  if (!file.type.startsWith('image/')) throw new ThemeImageError('themeImageFailed')

  const spec = SPECS[kind]
  const source = await decode(file)
  const natural = sizeOf(source)
  if (natural.w < 1 || natural.h < 1) throw new ThemeImageError('themeImageFailed')

  const hasAlpha = detectAlpha(source)
  const crop = spec.trim ? trimAlphaBounds(source) : { x: 0, y: 0, ...natural }

  const measured =
    spec.minEdgeAxis === 'w' ? crop.w : spec.minEdgeAxis === 'h' ? crop.h : Math.max(crop.w, crop.h)

  let warning: string | undefined
  if (measured < spec.minEdge) warning = 'themeImageTooSmall'
  else if (kind === 'figure' && !hasAlpha) warning = 'themeWarnNoAlpha'

  let boxScale = 1
  let quality = spec.quality
  let best: { blob: Blob; canvas: HTMLCanvasElement } | null = null

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const box = { w: spec.box.w * boxScale, h: spec.box.h * boxScale }
    // Contain, and never upscale: enlarging a small source only inflates the file
    // for pixels the encoder invented.
    const fit = Math.min(box.w / crop.w, box.h / crop.h, 1)
    const canvas = makeCanvas(crop.w * fit, crop.h * fit)
    const ctx = context(canvas)
    if (spec.flatten) {
      ctx.fillStyle = backgroundHex
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(source, crop.x, crop.y, crop.w, crop.h, 0, 0, canvas.width, canvas.height)

    const blob = await toBlob(canvas, quality)
    best = { blob, canvas }
    if (blob.size <= spec.soft) break

    if (attempt === 0) quality = Math.max(0.5, quality - 0.12)
    else boxScale *= 0.8
  }

  if (!best) throw new ThemeImageError('themeImageFailed')
  if (best.blob.size > spec.hard) {
    throw new ThemeImageError('themeImageTooBig', { n: Math.round(best.blob.size / 1024) })
  }

  const cells = cellColors(best.canvas)
  const sorted = cells
    .map((hex) => ({ hex, y: relativeLuminance(hex) }))
    .sort((a, b) => a.y - b.y)

  if ('close' in source) source.close()

  return {
    blob: best.blob,
    mime: OUTPUT_MIME,
    w: best.canvas.width,
    h: best.canvas.height,
    bytes: best.blob.size,
    darkestCell: sorted[0]?.hex ?? backgroundHex,
    lightestCell: sorted[sorted.length - 1]?.hex ?? backgroundHex,
    hasAlpha,
    warning,
  }
}
