import { supabase } from '@/lib/supabase/client'

export interface SignUpInput {
  email: string
  password: string
  displayName: string
}

export interface SignInInput {
  email: string
  password: string
}

function redirectTo(path: string): string {
  return `${window.location.origin}${path}`
}

export async function signUpWithPassword({ email, password, displayName }: SignUpInput) {
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  })
  if (error) throw error
}

export async function signInWithPassword({ email, password }: SignInInput) {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
}

export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: redirectTo('/') },
  })
  if (error) throw error
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function sendPasswordResetEmail(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirectTo('/reset-password'),
  })
  if (error) throw error
}

export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
}
