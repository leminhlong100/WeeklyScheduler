import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthContext'
import {
  createDailyNote,
  deleteDailyNote,
  listDailyNotes,
  setDailyNoteDone,
  setDailyNoteSpecial,
  type DailyNote,
} from '../api/dailyNotesApi'

const key = (userId: string | undefined) => ['daily-notes', userId] as const

export function useDailyNotes() {
  const { user } = useAuth()
  return useQuery({
    queryKey: key(user?.id),
    queryFn: () => listDailyNotes(user!.id),
    enabled: !!user,
  })
}

/** Keeps the list in the same order the API returns: newest day first, oldest note first within a day. */
function sortNotes(notes: DailyNote[]): DailyNote[] {
  return [...notes].sort(
    (a, b) => b.note_date.localeCompare(a.note_date) || a.created_at.localeCompare(b.created_at),
  )
}

export function useCreateDailyNote() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { text: string; noteDate: string; special: boolean }) =>
      createDailyNote({ userId: user!.id, ...input }),
    onSuccess: (created) => {
      queryClient.setQueryData<DailyNote[]>(key(user?.id), (prev) =>
        sortNotes([...(prev ?? []), created]),
      )
    },
  })
}

export function useToggleDailyNote() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) => setDailyNoteDone(id, done),
    onMutate: ({ id, done }) => {
      const previous = queryClient.getQueryData<DailyNote[]>(key(user?.id))
      queryClient.setQueryData<DailyNote[]>(key(user?.id), (prev) =>
        (prev ?? []).map((n) => (n.id === id ? { ...n, done } : n)),
      )
      return { previous }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(key(user?.id), ctx.previous)
    },
  })
}

export function useToggleDailyNoteSpecial() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, special }: { id: string; special: boolean }) =>
      setDailyNoteSpecial(id, special),
    onMutate: ({ id, special }) => {
      const previous = queryClient.getQueryData<DailyNote[]>(key(user?.id))
      queryClient.setQueryData<DailyNote[]>(key(user?.id), (prev) =>
        (prev ?? []).map((n) => (n.id === id ? { ...n, special } : n)),
      )
      return { previous }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(key(user?.id), ctx.previous)
    },
  })
}

export function useDeleteDailyNote() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteDailyNote(id),
    onMutate: (id) => {
      const previous = queryClient.getQueryData<DailyNote[]>(key(user?.id))
      queryClient.setQueryData<DailyNote[]>(key(user?.id), (prev) =>
        (prev ?? []).filter((n) => n.id !== id),
      )
      return { previous }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(key(user?.id), ctx.previous)
    },
  })
}
