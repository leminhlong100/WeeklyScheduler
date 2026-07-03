// One-off generator for PWA icon PNGs. `sharp` isn't a project dependency
// (it's a large native binary only needed here) — install it temporarily
// with `npm install -D sharp`, run `node scripts/generate-pwa-icons.mjs`
// whenever the source mark below changes, then uninstall it again.
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const outDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/icons')

// Lavender brand gradient (default theme) behind the white bolt mark, with
// generous padding baked in so this same source works for both the regular
// "any" icon and Android's maskable safe-zone (inner ~80% circle).
const SOURCE_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#9b86f0"/>
      <stop offset="1" stop-color="#e089c6"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#bg)"/>
  <g transform="translate(155.2,159.4) scale(4.2)">
    <path fill="#ffffff" d="M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z"/>
  </g>
</svg>
`.trim()

const targets = [
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-512.png', size: 512 },
  { file: 'maskable-512.png', size: 512 },
  { file: 'apple-touch-icon.png', size: 180 },
]

await mkdir(outDir, { recursive: true })

for (const { file, size } of targets) {
  const buffer = await sharp(Buffer.from(SOURCE_SVG)).resize(size, size).png().toBuffer()
  await writeFile(path.join(outDir, file), buffer)
  console.log(`wrote ${file} (${size}x${size})`)
}
