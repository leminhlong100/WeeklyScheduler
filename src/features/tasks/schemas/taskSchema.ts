import { z } from 'zod'

export const taskSchema = z.object({
  title: z.string().min(1, 'fieldRequired').max(120),
  categoryId: z.string().nullable(),
  taskDate: z.string().min(1, 'fieldRequired'),
  startMinute: z.number().int(),
  durationMinute: z.number().int().min(15),
  /** How many consecutive weeks to create the task on; 1 means it does not repeat. */
  repeatWeeks: z.number().int().min(1).max(52),
})

export type TaskFormInput = z.infer<typeof taskSchema>
