"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"

export type UploadStatus = "pending" | "uploading" | "processing" | "ready" | "failed"

export type UploadItem = {
  localId: string
  file: File
  imageId?: string
  status: UploadStatus
  progress: number
  error?: string
}

type Patch = Partial<Omit<UploadItem, "localId" | "file">>

function putWithProgress(url: string, file: File, onProgress: (p: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else reject(new Error(`Upload failed (${xhr.status})`))
    }
    xhr.onerror = () => reject(new Error("Network error during upload"))
    xhr.open("PUT", url)
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream")
    xhr.send(file)
  })
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init)
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error ?? res.statusText)
  return body as T
}

export function useUpload() {
  const [items, setItems] = useState<UploadItem[]>([])
  const qc = useQueryClient()
  const intervalsRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map())

  useEffect(() => {
    const intervals = intervalsRef.current
    return () => intervals.forEach((id) => clearInterval(id))
  }, [])

  const patch = useCallback((localId: string, update: Patch) => {
    setItems((prev) =>
      prev.map((item) => (item.localId === localId ? { ...item, ...update } : item))
    )
  }, [])

  const startUpload = useCallback(
    async (item: UploadItem) => {
      try {
        patch(item.localId, { status: "uploading", progress: 0 })

        const { image_id, upload_url } = await apiFetch<{ image_id: string; upload_url: string }>(
          "/api/upload/init",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              filename: item.file.name,
              mime_type: item.file.type || "application/octet-stream",
              size_bytes: item.file.size,
            }),
          }
        )

        patch(item.localId, { imageId: image_id })

        await putWithProgress(upload_url, item.file, (progress) => {
          patch(item.localId, { progress })
        })

        await apiFetch("/api/upload/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image_id }),
        })

        patch(item.localId, { status: "processing", progress: 100 })

        const intervalId = setInterval(async () => {
          try {
            const { status } = await apiFetch<{ status: UploadStatus }>(
              `/api/upload/status/${image_id}`
            )
            if (status === "ready") {
              patch(item.localId, { status: "ready" })
              clearInterval(intervalsRef.current.get(item.localId))
              intervalsRef.current.delete(item.localId)
              qc.invalidateQueries({ queryKey: ["media"] })
            } else if (status === "failed") {
              patch(item.localId, { status: "failed", error: "Processing failed" })
              clearInterval(intervalsRef.current.get(item.localId))
              intervalsRef.current.delete(item.localId)
            }
          } catch {
            // transient poll error — keep trying
          }
        }, 2_000)

        intervalsRef.current.set(item.localId, intervalId)
      } catch (err) {
        patch(item.localId, {
          status: "failed",
          error: err instanceof Error ? err.message : "Upload failed",
        })
      }
    },
    [patch, qc]
  )

  const addFiles = useCallback(
    (files: File[]) => {
      const newItems: UploadItem[] = files.map((file, i) => ({
        localId: `${Date.now()}-${i}`,
        file,
        status: "pending",
        progress: 0,
      }))
      setItems((prev) => [...prev, ...newItems])
      newItems.forEach((item) => startUpload(item))
    },
    [startUpload]
  )

  const removeItem = useCallback((localId: string) => {
    const id = intervalsRef.current.get(localId)
    if (id) {
      clearInterval(id)
      intervalsRef.current.delete(localId)
    }
    setItems((prev) => prev.filter((i) => i.localId !== localId))
  }, [])

  const clearCompleted = useCallback(() => {
    setItems((prev) => prev.filter((i) => i.status !== "ready" && i.status !== "failed"))
  }, [])

  return { items, addFiles, removeItem, clearCompleted }
}
