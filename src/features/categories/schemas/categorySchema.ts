import { z } from 'zod'

export const categorySchema = z.object({
  name: z.string().min(1, 'fieldRequired').max(40),
  emoji: z.string().min(1, 'fieldRequired'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'fieldRequired'),
})

export type CategoryFormInput = z.infer<typeof categorySchema>
