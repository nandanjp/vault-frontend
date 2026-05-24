"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, Download, Trash2, AlertCircle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useMediaItem, useDeleteMedia } from "@/hooks/use-media"

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(dateStr))
}

export default function ImageDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: image, isLoading, isError } = useMediaItem(id)
  const deleteMedia = useDeleteMedia()
  const [imgLoaded, setImgLoaded] = useState(false)

  const handleDelete = () => {
    deleteMedia.mutate(id, {
      onSuccess: () => router.push("/dashboard"),
    })
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Image not found or failed to load.
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/dashboard" className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}>
            <ArrowLeft className="size-4" />
          </Link>
          {isLoading ? (
            <Skeleton className="h-5 w-52" />
          ) : (
            <h1 className="truncate text-lg font-semibold" title={image?.filename}>
              {image?.filename}
            </h1>
          )}
        </div>

        {!isLoading && image && (
          <div className="flex shrink-0 items-center gap-2">
            {image.status === "ready" && image.url && (
              <a
                href={image.url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-2")}
              >
                <Download className="size-4" />
                Download
              </a>
            )}
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    disabled={deleteMedia.isPending}
                  />
                }
              >
                <Trash2 className="size-4" />
                Delete
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete image?</AlertDialogTitle>
                  <AlertDialogDescription>
                    <span className="font-medium">{image.filename}</span> will be permanently
                    removed. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
        {/* Image panel */}
        <div className="overflow-hidden rounded-xl border border-border bg-muted">
          {isLoading ? (
            <Skeleton className="aspect-[4/3] w-full rounded-none" />
          ) : image?.status === "ready" && image.url ? (
            <div className="flex min-h-96 items-center justify-center p-6">
              <Image
                src={image.url}
                alt={image.filename}
                width={image.width ?? 1200}
                height={image.height ?? 900}
                className={cn(
                  "max-h-[72vh] w-auto rounded-lg object-contain shadow-sm transition-opacity duration-500",
                  imgLoaded ? "opacity-100" : "opacity-0"
                )}
                onLoad={() => setImgLoaded(true)}
                unoptimized
                priority
              />
            </div>
          ) : image?.status === "failed" ? (
            <div className="flex min-h-96 flex-col items-center justify-center gap-3 text-muted-foreground">
              <AlertCircle className="size-10 text-destructive/50" />
              <p className="text-sm">Processing failed</p>
              <p className="text-xs text-muted-foreground/70">You can delete this image and try uploading again.</p>
            </div>
          ) : (
            <div className="flex min-h-96 flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="size-10 animate-spin opacity-30" />
              <p className="text-sm">Processing image…</p>
            </div>
          )}
        </div>

        {/* Metadata sidebar */}
        <div className="lg:sticky lg:top-22 lg:self-start">
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Details
            </h2>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex justify-between gap-4">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </div>
            ) : image ? (
              <dl className="space-y-3.5">
                <MetaRow label="Status">
                  <StatusIndicator status={image.status} />
                </MetaRow>
                {image.width && image.height && (
                  <MetaRow label="Dimensions">
                    <span className="tabular-nums">
                      {image.width} × {image.height}
                    </span>
                  </MetaRow>
                )}
                <MetaRow label="File size">{formatBytes(image.size_bytes)}</MetaRow>
                <MetaRow label="Type">
                  <span className="uppercase">{image.mime_type.split("/")[1]}</span>
                </MetaRow>
                <MetaRow label="Uploaded">{formatDate(image.created_at)}</MetaRow>
              </dl>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  )
}

function StatusIndicator({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ready: "text-emerald-600 dark:text-emerald-400",
    failed: "text-destructive",
    pending: "text-amber-600 dark:text-amber-400",
    processing: "text-amber-600 dark:text-amber-400",
  }
  return (
    <span className={cn("flex items-center gap-1.5 capitalize", colors[status] ?? "text-muted-foreground")}>
      <span className="inline-block size-1.5 rounded-full bg-current" />
      {status}
    </span>
  )
}
