"use client"

import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query"
import { toast } from "sonner"
import { apiFetch } from "@/lib/client-fetch"
import { normalizeImage } from "@/lib/url-cache"
import type { Album, ImagePage } from "@/lib/api"

export function useAlbums() {
    return useQuery<Album[]>({
        queryKey: ["albums"],
        queryFn: () => apiFetch<{ items: Album[] }>("/api/albums").then((r) => r.items),
        staleTime: 60_000,
    })
}

export function useAlbumImages(id: string, page: number, limit = 20, enabled = true) {
    return useQuery<ImagePage>({
        queryKey: ["albums", id, "images", page, limit],
        queryFn: () => apiFetch(`/api/albums/${id}/images?page=${page}&limit=${limit}`),
        placeholderData: keepPreviousData,
        staleTime: 30_000,
        enabled,
        select: (data) => ({ ...data, items: data.items.map(normalizeImage) }),
    })
}

export function useCreateAlbum() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ name, description }: { name: string; description?: string }) =>
            apiFetch<Album>("/api/albums", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, description }),
            }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["albums"] })
            toast.success("Album created")
        },
        onError: () => toast.error("Failed to create album"),
    })
}

export function useUpdateAlbum() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({
            id,
            name,
            description,
        }: {
            id: string
            name: string
            description?: string
        }) =>
            apiFetch<Album>(`/api/albums/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, description }),
            }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["albums"] })
            toast.success("Album updated")
        },
        onError: () => toast.error("Failed to update album"),
    })
}

export function useDeleteAlbum() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (id: string) => apiFetch(`/api/albums/${id}`, { method: "DELETE" }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["albums"] })
            toast.success("Album deleted")
        },
        onError: () => toast.error("Failed to delete album"),
    })
}

export function useAddToAlbum() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ albumId, imageIds }: { albumId: string; imageIds: string[] }) =>
            apiFetch(`/api/albums/${albumId}/images`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ image_ids: imageIds }),
            }),
        onSuccess: (_data, { albumId }) => {
            qc.invalidateQueries({ queryKey: ["albums", albumId] })
            toast.success("Added to album")
        },
        onError: () => toast.error("Failed to add to album"),
    })
}

export function useRemoveFromAlbum() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ albumId, imageId }: { albumId: string; imageId: string }) =>
            apiFetch(`/api/albums/${albumId}/images/${imageId}`, { method: "DELETE" }),
        onSuccess: (_data, { albumId }) => {
            qc.invalidateQueries({ queryKey: ["albums", albumId, "images"] })
            toast.success("Removed from album")
        },
        onError: () => toast.error("Failed to remove from album"),
    })
}
