import { z } from 'zod'

/**
 * Validation messages are Dictionary keys (not literal text) so the same
 * schema works for every locale — see `translateFieldError`.
 */
export const loginSchema = z.object({
  email: z.string().min(1, 'fieldRequired').email('invalidEmail'),
  password: z.string().min(1, 'fieldRequired'),
})
export type LoginInput = z.infer<typeof loginSchema>

export const signupSchema = z
  .object({
    displayName: z.string().min(1, 'fieldRequired'),
    email: z.string().min(1, 'fieldRequired').email('invalidEmail'),
    password: z.string().min(6, 'passwordTooShort'),
    confirmPassword: z.string().min(1, 'fieldRequired'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'passwordMismatch',
    path: ['confirmPassword'],
  })
export type SignupInput = z.infer<typeof signupSchema>

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'fieldRequired').email('invalidEmail'),
})
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>

export const resetPasswordSchema = z
  .object({
    password: z.string().min(6, 'passwordTooShort'),
    confirmPassword: z.string().min(1, 'fieldRequired'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'passwordMismatch',
    path: ['confirmPassword'],
  })
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
