import path from 'node:path'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import parseExpenseHandler from './netlify/functions/parse-expense.js'

/** A Netlify Function v2 handler: takes a standard Request, returns a Response. */
type NetlifyHandler = (req: Request) => Promise<Response>

/**
 * Serves one Netlify Function (v2) from inside `vite dev`, so `npm run dev`
 * reaches `/.netlify/functions/<name>` without the Netlify CLI. It mounts the
 * REAL handler rather than reimplementing it, so dev and production agree on
 * both the success and the error shapes.
 *
 * Handlers read their secrets off `process.env`. Vite only exposes `VITE_*` to
 * the client, so the unprefixed keys are copied here out of the env loaded with
 * an empty prefix (see `loadEnv` below) into `process.env`.
 */
function netlifyFunctionDevPlugin(
  name: string,
  handler: NetlifyHandler,
  env: Record<string, string>,
  envKeys: string[] = ['GROQ_API_KEY', 'GROQ_MODEL', 'VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'],
): Plugin {
  return {
    name: `${name}-dev-proxy`,
    apply: 'serve',
    configureServer(server) {
      for (const key of envKeys) {
        if (!process.env[key] && env[key]) process.env[key] = env[key]
      }
      server.middlewares.use(`/.netlify/functions/${name}`, (req, res) => {
        let raw = ''
        req.on('data', (chunk) => (raw += chunk))
        req.on('end', async () => {
          try {
            // Authorization has to survive the hop — the function verifies the
            // caller's Supabase JWT. Netlify passes it through in production.
            const headers: Record<string, string> = { 'Content-Type': 'application/json' }
            if (req.headers.authorization) headers.Authorization = req.headers.authorization
            const request = new Request(`http://local/.netlify/functions/${name}`, {
              method: req.method,
              headers,
              body: req.method === 'GET' || req.method === 'HEAD' ? undefined : raw,
            })
            const response = await handler(request)
            res.statusCode = response.status
            res.setHeader('Content-Type', 'application/json')
            res.end(await response.text())
          } catch (e) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(
              JSON.stringify({
                error: { code: 'upstream', message: (e as Error)?.message || 'Lỗi không xác định' },
              }),
            )
          }
        })
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    port: Number(process.env.PORT) || 5173,
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.png'],
      manifest: {
        id: '/',
        name: 'Lịch Tuần — Weekly Scheduler',
        short_name: 'Lịch Tuần',
        description: 'Cute weekly scheduler with drag & drop tasks, categories, themes and stickers.',
        lang: 'vi',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#faf6ff',
        theme_color: '#9b86f0',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Font files are excluded from precache on purpose: @fontsource ships
        // one file per CJK unicode-range subset (hundreds of them), which
        // would otherwise force the SW to download tens of MB up front.
        // They're cached lazily instead, the first time each subset is used.
        globPatterns: ['**/*.{js,css,html,svg,png}'],
        navigateFallbackDenylist: [/^\/(auth|rest|storage)\//],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.hostname.endsWith('.supabase.co') && url.pathname.startsWith('/rest/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-rest',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ request }) => request.destination === 'font',
            handler: 'CacheFirst',
            options: {
              cacheName: 'app-fonts',
              expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
    // Dev only (`apply: 'serve'`), so none of this reaches the production
    // bundle. `loadEnv(mode, cwd, '')` — the empty prefix — is what makes the
    // unprefixed `GROQ_API_KEY` readable here; it is deliberately NOT fed into
    // `define`, which would inline the secret into client code.
    netlifyFunctionDevPlugin('parse-expense', parseExpenseHandler, loadEnv(mode, process.cwd(), '')),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
}))
