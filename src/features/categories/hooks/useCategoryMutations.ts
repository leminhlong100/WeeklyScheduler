import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthContext'
import {
  createCategory,
  deleteCategory,
  updateCategory,
  type Category,
  type CategoryUpdate,
} from '../api/categoriesApi'
import { categoriesQueryKey } from './useCategories'

interface CreateCategoryVars {
  name: string
  emoji: string
  color: string
}

export function useCreateCategory() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const key = categoriesQueryKey(user?.id)

  return useMutation({
    mutationFn: (input: CreateCategoryVars) => {
      const existing = queryClient.getQueryData<Category[]>(key) ?? []
      return createCategory({ ...input, user_id: user!.id, sort_order: existing.length })
    },
    onSuccess: (created) => {
      queryClient.setQueryData<Category[]>(key, (prev) => [...(prev ?? []), created])
    },
  })
}

export function useUpdateCategory() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const key = categoriesQueryKey(user?.id)

  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: CategoryUpdate }) => updateCategory(id, patch),
    onMutate: async ({ id, patch }) => {
      const previous = queryClient.getQueryData<Category[]>(key)
      queryClient.setQueryData<Category[]>(key, (prev) =>
        (prev ?? []).map((c) => (c.id === id ? { ...c, ...patch } : c)),
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous)
    },
  })
}

export function useDeleteCategory() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const key = categoriesQueryKey(user?.id)

  return useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onMutate: async (id) => {
      const previous = queryClient.getQueryData<Category[]>(key)
      queryClient.setQueryData<Category[]>(key, (prev) => (prev ?? []).filter((c) => c.id !== id))
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous)
    },
  })
}
