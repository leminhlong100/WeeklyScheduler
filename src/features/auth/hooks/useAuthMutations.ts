import { useMutation } from '@tanstack/react-query'
import {
  sendPasswordResetEmail,
  signInWithGoogle,
  signInWithPassword,
  signOut,
  signUpWithPassword,
  updatePassword,
  type SignInInput,
  type SignUpInput,
} from '../api/authApi'

export function useSignIn() {
  return useMutation<void, Error, SignInInput>({ mutationFn: signInWithPassword })
}

export function useSignUp() {
  return useMutation<void, Error, SignUpInput>({ mutationFn: signUpWithPassword })
}

export function useGoogleSignIn() {
  return useMutation<void, Error, void>({ mutationFn: signInWithGoogle })
}

export function useSignOut() {
  return useMutation<void, Error, void>({ mutationFn: signOut })
}

export function useSendPasswordReset() {
  return useMutation<void, Error, string>({ mutationFn: sendPasswordResetEmail })
}

export function useUpdatePassword() {
  return useMutation<void, Error, string>({ mutationFn: updatePassword })
}
