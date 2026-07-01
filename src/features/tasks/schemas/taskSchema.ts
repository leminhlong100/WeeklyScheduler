import { z } from 'zod'

export const taskSchema = z.object({
  title: z.string().min(1, 'fieldRequired').max(120),
  categoryId: z.string().nullable(),
  taskDate: z.string().min(1, 'fieldRequired'),
  startMinute: z.number().int(),
  durationMinute: z.number().int().min(15),
})

export type TaskFormInput = z.infer<typeof taskSchema>
