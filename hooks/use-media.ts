"use client"

import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query"
import { toast } from "sonner"
import type { Image, ImagePage } from "@/lib/api"

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? res.statusText)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export function useMedia(page: number, limit = 20) {
  return useQuery<ImagePage>({
    queryKey: ["media", page, limit],
    queryFn: () => apiFetch(`/api/media?page=${page}&limit=${limit}`),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })
}

export function useDeleteMedia() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/media/${id}`, { method: "DELETE" }),
    onSuccess: (_data, id) => {
      qc.setQueriesData<ImagePage>({ queryKey: ["media"] }, (old) => {
        if (!old) return old
        return {
          ...old,
          items: old.items.filter((img: Image) => img.id !== id),
          total: old.total - 1,
        }
      })
      toast.success("Image deleted")
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to delete image")
    },
  })
}
