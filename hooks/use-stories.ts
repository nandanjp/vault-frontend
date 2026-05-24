"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { StoryDetail, SlideInput } from "@/lib/api"

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json", ...init.headers as Record<string, string> },
    ...init,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? res.statusText)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export function useStories() {
  return useQuery({
    queryKey: ["stories"],
    queryFn: () => apiFetch<{ items: import("@/lib/api").Story[] }>("/api/stories").then((d) => d.items),
  })
}

export function useStory(id: string) {
  return useQuery({
    queryKey: ["stories", id],
    queryFn: () => apiFetch<StoryDetail>(`/api/stories/${id}`),
    enabled: !!id,
  })
}

export function useCreateStory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (title: string) =>
      apiFetch<import("@/lib/api").Story>("/api/stories", {
        method: "POST",
        body: JSON.stringify({ title }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stories"] }),
  })
}

export function useUpdateStory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, title, slides }: { id: string; title: string; slides: SlideInput[] }) =>
      apiFetch<StoryDetail>(`/api/stories/${id}`, {
        method: "PUT",
        body: JSON.stringify({ title, slides }),
      }),
    onSuccess: (data) => {
      qc.setQueryData(["stories", data.id], data)
      qc.invalidateQueries({ queryKey: ["stories"] })
    },
  })
}

export function useDeleteStory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/api/stories/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stories"] }),
  })
}
