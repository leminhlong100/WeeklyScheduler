import { supabase } from '@/lib/supabase/client'
import type { Database, Json } from '@/lib/supabase/database.types'
import { ART_BUCKET, ART_PREFIX, type ArtSlot } from '../art/constants'
import type { CustomThemeDraft } from '../recipe/types'

export type CustomThemeRow = Database['public']['Tables']['custom_themes']['Row']

export async function listCustomThemes(userId: string): Promise<CustomThemeRow[]> {
  const { data, error } = await supabase
    .from('custom_themes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

/**
 * The id is generated here rather than by the database.
 *
 * Artwork lives at `<userId>/<themeId>/<slot>-<ts>.webp`, so the theme has to
 * have an id before its first upload — which happens while the user is still
 * editing, long before the row exists. `Insert.id?: string` accommodates this.
 */
export function newCustomThemeId(): string {
  return crypto.randomUUID()
}

interface SaveArgs extends CustomThemeDraft {
  id: string
  userId: string
}

export async function createCustomTheme(args: SaveArgs): Promise<CustomThemeRow> {
  const { data, error } = await supabase
    .from('custom_themes')
    .insert({
      id: args.id,
      user_id: args.userId,
      name: args.name,
      icon: args.icon,
      recipe: args.recipe as unknown as Json,
      overrides: args.overrides as unknown as Json,
      art: (args.art ?? null) as unknown as Json | null,
    })
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function updateCustomTheme(args: SaveArgs): Promise<CustomThemeRow> {
  const { data, error } = await supabase
    .from('custom_themes')
    .update({
      name: args.name,
      icon: args.icon,
      recipe: args.recipe as unknown as Json,
      overrides: args.overrides as unknown as Json,
      art: (args.art ?? null) as unknown as Json | null,
    })
    .eq('id', args.id)
    .select('*')
    .single()
  if (error) throw error
  return data
}

/**
 * Deletes the row first, then the objects, and does not fail if the objects
 * survive.
 *
 * The order matters. Reversed — objects gone, row delete fails — the theme is
 * still in the picker but renders dead URLs, a visible break the user cannot
 * fix. This way the worst case is orphaned bytes: invisible, and swept up by
 * `findOrphanThemeArt` on a later session.
 */
export async function deleteCustomTheme(userId: string, themeId: string): Promise<void> {
  const { error } = await supabase.from('custom_themes').delete().eq('id', themeId)
  if (error) throw error
  try {
    const paths = await listThemeArtPaths(userId, themeId)
    if (paths.length > 0) await supabase.storage.from(ART_BUCKET).remove(paths)
  } catch {
    // Orphan sweep will get them.
  }
}

/**
 * Uploads one art slot and returns its public URL.
 *
 * **Never `upsert`.** Public objects are served with `max-age=3600`, so
 * overwriting a path would keep serving the old bytes for up to an hour — the
 * user would swap their background and see nothing change. A fresh timestamped
 * name every time, and the previous object is removed after the row update
 * succeeds.
 */
export async function uploadThemeArt(args: {
  userId: string
  themeId: string
  slot: ArtSlot
  blob: Blob
  mime: string
}): Promise<string> {
  const path = `${args.userId}/${args.themeId}/${args.slot}-${Date.now()}.webp`
  const { error } = await supabase.storage.from(ART_BUCKET).upload(path, args.blob, {
    contentType: args.mime,
    upsert: false,
  })
  if (error) throw error
  return `${ART_PREFIX}${path}`
}

/** Inverse of the URL built by `uploadThemeArt`. Null for anything foreign. */
export function storagePathFromPublicUrl(url: string): string | null {
  if (!url.startsWith(ART_PREFIX)) return null
  const path = url.slice(ART_PREFIX.length)
  return path.length > 0 ? path : null
}

/** Best-effort removal; callers treat failure as "sweep it later". */
export async function removeThemeArt(urls: string[]): Promise<void> {
  const paths = urls
    .map(storagePathFromPublicUrl)
    .filter((path): path is string => path !== null)
  if (paths.length === 0) return
  await supabase.storage.from(ART_BUCKET).remove(paths)
}

export async function listThemeArtPaths(userId: string, themeId: string): Promise<string[]> {
  const prefix = `${userId}/${themeId}`
  const { data, error } = await supabase.storage.from(ART_BUCKET).list(prefix)
  if (error) throw error
  return (data ?? []).map((entry) => `${prefix}/${entry.name}`)
}

/**
 * Every object under the user's folder that no surviving theme references.
 *
 * This is what makes the best-effort deletes above eventually correct: a failed
 * cleanup, a tab closed mid-save, or a theme deleted from another device all
 * leave bytes behind, and nothing else would ever notice.
 *
 * Depends on the bucket's public SELECT policy — `storage.list()` goes through
 * RLS even though the `/object/public/` read route does not, and without the
 * policy it returns an empty array rather than an error.
 */
export async function findOrphanThemeArt(
  userId: string,
  referencedUrls: string[],
): Promise<string[]> {
  const { data: folders, error } = await supabase.storage.from(ART_BUCKET).list(userId)
  if (error) throw error

  const referenced = new Set(
    referencedUrls
      .map(storagePathFromPublicUrl)
      .filter((path): path is string => path !== null),
  )

  const orphans: string[] = []
  for (const folder of folders ?? []) {
    // Storage lists pseudo-directories with a null id; files have one.
    if (folder.id) continue
    const prefix = `${userId}/${folder.name}`
    const { data: files } = await supabase.storage.from(ART_BUCKET).list(prefix)
    for (const file of files ?? []) {
      const path = `${prefix}/${file.name}`
      if (!referenced.has(path)) orphans.push(path)
    }
  }
  return orphans
}

export async function purgeOrphanThemeArt(
  userId: string,
  referencedUrls: string[],
): Promise<number> {
  const orphans = await findOrphanThemeArt(userId, referencedUrls)
  if (orphans.length === 0) return 0
  const { error } = await supabase.storage.from(ART_BUCKET).remove(orphans)
  if (error) throw error
  return orphans.length
}
