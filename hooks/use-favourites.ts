"use client"

import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query"
import { toast } from "sonner"
import { apiFetch } from "@/lib/client-fetch"
import { normalizeImage } from "@/lib/url-cache"
import type { Image, ImagePage } from "@/lib/api"

export function useFavourites(page = 1, limit = 20) {
  return useQuery<ImagePage>({
    queryKey: ["favourites", page],
    queryFn: () => apiFetch(`/api/favourites?page=${page}&limit=${limit}`),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    select: (data) => ({ ...data, items: data.items.map(normalizeImage) }),
  })
}

export function useToggleFavourite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isFav }: { id: string; isFav: boolean }) =>
      apiFetch(`/api/favourites/${id}`, { method: isFav ? "DELETE" : "POST" }),
    onMutate: async ({ id, isFav }) => {
      // Optimistic update on the single-item cache
      qc.setQueryData<Image & { url?: string }>(["media", "item", id], (old) =>
        old ? { ...old, is_favourited: !isFav } : old
      )
    },
    onSuccess: (_data, { isFav }) => {
      qc.invalidateQueries({ queryKey: ["favourites"] })
      qc.invalidateQueries({ queryKey: ["media"] })
      qc.invalidateQueries({ queryKey: ["gallery"] })
      toast.success(isFav ? "Removed from favourites" : "Added to favourites")
    },
    onError: (_err, { id, isFav }) => {
      // Revert optimistic update
      qc.setQueryData<Image & { url?: string }>(["media", "item", id], (old) =>
        old ? { ...old, is_favourited: isFav } : old
      )
      toast.error("Failed to update favourites")
    },
  })
}
