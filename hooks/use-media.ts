"use client"

import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query"
import { toast } from "sonner"
import { apiFetch } from "@/lib/client-fetch"
import type { Image, ImagePage } from "@/lib/api"

export function useMediaItem(id: string) {
  return useQuery<Image>({
    queryKey: ["media", "item", id],
    queryFn: () => apiFetch(`/api/media/${id}`),
    staleTime: 30_000,
  })
}

export function useMedia(page: number, limit = 20) {
  return useQuery<ImagePage>({
    queryKey: ["media", page, limit],
    queryFn: () => apiFetch(`/api/media?page=${page}&limit=${limit}`),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    // Auto-poll while any image is still processing so the dashboard
    // updates without requiring the upload page to remain mounted.
    refetchInterval: (query) => {
      const data = query.state.data
      const hasProcessing = data?.items.some(
        (img) => img.status === "processing" || img.status === "pending"
      )
      return hasProcessing ? 3_000 : false
    },
  })
}

export function useDeleteMedia() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/media/${id}`, { method: "DELETE" }),
    onSuccess: (_data, id) => {
      // Only update list-shaped cache entries — the item cache (["media","item",id])
      // is an Image object (no .items), so we guard before calling .filter().
      qc.setQueriesData<ImagePage>({ queryKey: ["media"] }, (old) => {
        if (!old || !("items" in old)) return old
        return {
          ...old,
          items: old.items.filter((img: Image) => img.id !== id),
          total: old.total - 1,
        }
      })
      // Drop the single-item cache so navigating back fetches fresh data.
      qc.removeQueries({ queryKey: ["media", "item", id] })
      toast.success("Image deleted")
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to delete image")
    },
  })
}
