"use client"

import { useQuery } from "@tanstack/react-query"
import { apiFetch } from "@/lib/client-fetch"
import type { Image } from "@/lib/api"

export function useGallery() {
  return useQuery<Image[]>({
    queryKey: ["gallery"],
    queryFn: () => apiFetch<{ items: Image[] }>("/api/gallery").then((r) => r.items),
    staleTime: 5 * 60_000,
  })
}
