"use client"

import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query"
import { toast } from "sonner"
import { apiFetch } from "@/lib/client-fetch"
import { normalizeImage, evictImage } from "@/lib/url-cache"
import type { Image, ImagePage } from "@/lib/api"

export function useMediaItem(id: string) {
    return useQuery<Image>({
        queryKey: ["media", "item", id],
        queryFn: () => apiFetch(`/api/media/${id}`),
        staleTime: 30_000,
        select: normalizeImage,
    })
}

export function useMedia(page: number, limit = 20) {
    return useQuery<ImagePage>({
        queryKey: ["media", page, limit],
        queryFn: () => apiFetch(`/api/media?page=${page}&limit=${limit}`),
        placeholderData: keepPreviousData,
        staleTime: 30_000,
        select: (data) => ({ ...data, items: data.items.map(normalizeImage) }),
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
        mutationFn: (id: string) => apiFetch(`/api/media/${id}`, { method: "DELETE" }),
        onSuccess: (_data, id) => {
            const filterPage = (old: ImagePage | undefined) => {
                if (!old || !("items" in old)) return old
                const items = old.items.filter((img: Image) => img.id !== id)
                if (items.length === old.items.length) return old // wasn't in this list
                return { ...old, items, total: old.total - 1 }
            }

            // All Photos (paginated ImagePage entries)
            qc.setQueriesData<ImagePage>({ queryKey: ["media"] }, filterPage)
            // Single-item detail cache
            qc.removeQueries({ queryKey: ["media", "item", id] })

            // Dashboard gallery carousel (Image[])
            qc.setQueriesData<Image[]>({ queryKey: ["gallery"] }, (old) =>
                old ? old.filter((img) => img.id !== id) : old
            )

            // Favourites (paginated ImagePage entries)
            qc.setQueriesData<ImagePage>({ queryKey: ["favourites"] }, filterPage)

            // Album image lists — ["albums", albumId, "images", page, limit]
            // The plain ["albums"] list query returns Album[], not ImagePage, so the
            // "items" in old guard inside filterPage safely skips it.
            qc.setQueriesData<ImagePage>({ queryKey: ["albums"] }, filterPage)

            // Drop from URL cache so a re-upload of a same-named file doesn't reuse stale URL
            evictImage(id)

            toast.success("Image deleted")
        },
        onError: (err: Error) => {
            toast.error(err.message ?? "Failed to delete image")
        },
    })
}
