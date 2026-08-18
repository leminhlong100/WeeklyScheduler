import { z } from 'zod'

export const taskSchema = z.object({
  title: z.string().min(1, 'fieldRequired').max(120),
  categoryId: z.string().nullable(),
  taskDate: z.string().min(1, 'fieldRequired'),
  startMinute: z.number().int(),
  durationMinute: z.number().int().min(15),
  /** How many consecutive weeks to create the task on; 1 means it does not repeat. */
  repeatWeeks: z.number().int().min(1).max(52),
  /**
   * Null follows the category. Hex-pinned to match the column's check
   * constraint — the swatches and the native picker can only produce that
   * shape, so this guards the request rather than the user.
   */
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .nullable(),
})

export type TaskFormInput = z.infer<typeof taskSchema>
