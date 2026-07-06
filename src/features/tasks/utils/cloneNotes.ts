import type { TaskNoteItem } from '../types'

/**
 * Deep-copies a task's note checklist for a duplicated/copied task, minting a
 * fresh id per item so the clone's notes never share identity with the
 * original's (keeps popover keying and future edits independent).
 */
export function cloneNotes(notes: TaskNoteItem[] | null | undefined): TaskNoteItem[] {
  return (notes ?? []).map((note) => ({ ...note, id: crypto.randomUUID() }))
}
