"use client"

import { useCallback, useRef, useState } from "react"
import Link from "next/link"
import {
  ImageUp,
  CheckCircle2,
  XCircle,
  Loader2,
  X,
  ArrowLeft,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button"
import { useUpload, type UploadItem } from "@/hooks/use-upload"

const ACCEPTED = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/avif"]
const MAX_SIZE = 50 * 1024 * 1024 // 50 MB

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

function filterFiles(files: File[]): { valid: File[]; rejected: string[] } {
  const valid: File[] = []
  const rejected: string[] = []
  for (const f of files) {
    if (!ACCEPTED.includes(f.type)) {
      rejected.push(`${f.name}: unsupported type`)
    } else if (f.size > MAX_SIZE) {
      rejected.push(`${f.name}: exceeds 50 MB`)
    } else {
      valid.push(f)
    }
  }
  return { valid, rejected }
}

export default function UploadPage() {
  const { items, addFiles, removeItem, clearCompleted } = useUpload()
  const [isDragging, setIsDragging] = useState(false)
  const [rejections, setRejections] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = useCallback(
    (files: File[]) => {
      const { valid, rejected } = filterFiles(files)
      setRejections(rejected)
      if (valid.length) addFiles(valid)
    },
    [addFiles]
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      handleFiles(Array.from(e.dataTransfer.files))
    },
    [handleFiles]
  )

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const onDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false)
  }

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) handleFiles(Array.from(e.target.files))
    e.target.value = ""
  }

  const hasCompleted = items.some((i) => i.status === "ready" || i.status === "failed")
  const allDone = items.length > 0 && items.every((i) => i.status === "ready" || i.status === "failed")

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex items-center gap-4">
        <Link href="/dashboard" className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}>
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Upload images</h1>
      </div>

      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-12 text-center transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border/60 bg-muted/30 hover:border-border hover:bg-muted/50"
        )}
      >
        <div className={cn(
          "rounded-full border p-4 transition-colors",
          isDragging ? "border-primary/30 bg-primary/10" : "border-border/50 bg-background"
        )}>
          <ImageUp className={cn("size-8 transition-colors", isDragging ? "text-primary" : "text-muted-foreground")} />
        </div>
        <div>
          <p className="font-medium">
            {isDragging ? "Drop to upload" : "Drag images here"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            or{" "}
            <span className="text-primary underline-offset-2 hover:underline">browse files</span>
            {" "}· PNG, JPG, GIF, WebP, AVIF · max 50 MB
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(",")}
          multiple
          className="sr-only"
          onChange={onInputChange}
        />
      </div>

      {/* Rejections */}
      {rejections.length > 0 && (
        <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <p className="text-sm font-medium text-destructive">Some files were skipped:</p>
          <ul className="mt-1 space-y-0.5">
            {rejections.map((r, i) => (
              <li key={i} className="text-xs text-destructive/80">{r}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Queue */}
      {items.length > 0 && (
        <div className="mt-6 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">
              {items.length} {items.length === 1 ? "file" : "files"}
            </p>
            {hasCompleted && (
              <Button variant="ghost" size="sm" onClick={clearCompleted}>
                Clear completed
              </Button>
            )}
          </div>

          <div className="divide-y divide-border/50 rounded-xl border border-border/50 bg-card">
            {items.map((item) => (
              <UploadRow key={item.localId} item={item} onRemove={removeItem} />
            ))}
          </div>

          {allDone && (
            <div className="mt-4 flex justify-end">
              <Link href="/dashboard" className={cn(buttonVariants(), "gap-2")}>
                View in dashboard
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function UploadRow({ item, onRemove }: { item: UploadItem; onRemove: (id: string) => void }) {
  const { status, file, progress, error } = item
  const isActive = status === "uploading" || status === "processing"

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <StatusIcon status={status} progress={progress} />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium" title={file.name}>
          {file.name}
        </p>

        <div className="mt-1 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{formatBytes(file.size)}</span>
          {status === "uploading" && (
            <span className="text-xs text-muted-foreground">· {progress}%</span>
          )}
          {status === "processing" && (
            <span className="text-xs text-amber-600 dark:text-amber-400">· processing…</span>
          )}
          {status === "ready" && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400">· ready</span>
          )}
          {status === "failed" && error && (
            <span className="text-xs text-destructive">· {error}</span>
          )}
        </div>

        {status === "uploading" && (
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {!isActive && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onRemove(item.localId)}
          className="shrink-0 text-muted-foreground hover:text-foreground"
        >
          <X className="size-3.5" />
        </Button>
      )}
    </div>
  )
}

function StatusIcon({ status, progress }: { status: UploadItem["status"]; progress: number }) {
  if (status === "ready") {
    return <CheckCircle2 className="size-5 shrink-0 text-emerald-500" />
  }
  if (status === "failed") {
    return <XCircle className="size-5 shrink-0 text-destructive" />
  }
  if (status === "uploading") {
    return (
      <div className="relative size-5 shrink-0">
        <svg className="-rotate-90" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="8" className="stroke-muted" strokeWidth="2.5" />
          <circle
            cx="10" cy="10" r="8"
            className="stroke-primary transition-all duration-150"
            strokeWidth="2.5"
            strokeDasharray={`${2 * Math.PI * 8}`}
            strokeDashoffset={`${2 * Math.PI * 8 * (1 - progress / 100)}`}
            strokeLinecap="round"
          />
        </svg>
      </div>
    )
  }
  if (status === "processing") {
    return <Loader2 className="size-5 shrink-0 animate-spin text-amber-500" />
  }
  return <div className="size-5 shrink-0 rounded-full border-2 border-border/60" />
}
