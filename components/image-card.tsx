"use client"

import Image from "next/image"
import { Trash2, AlertCircle, Clock, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import type { Image as ImageModel } from "@/lib/api"

interface ImageCardProps {
  image: ImageModel
  onDelete: (id: string) => void
  isDeleting: boolean
}

export function ImageCard({ image, onDelete, isDeleting }: ImageCardProps) {
  const isReady = image.status === "ready"
  const isFailed = image.status === "failed"
  const isProcessing = image.status === "processing" || image.status === "pending"

  return (
    <div className="group relative overflow-hidden rounded-lg border border-border/50 bg-card transition-all hover:border-border hover:shadow-md">
      <div className="aspect-square w-full overflow-hidden bg-muted">
        {isReady && image.url ? (
          <Image
            src={image.url}
            alt={image.filename}
            width={image.width ?? 400}
            height={image.height ?? 400}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            unoptimized
          />
        ) : isFailed ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <AlertCircle className="size-8 text-destructive/60" />
            <span className="text-xs">Processing failed</span>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="size-8 animate-spin opacity-40" />
            <span className="text-xs">Processing…</span>
          </div>
        )}
      </div>

      <div className="p-3">
        <p className="truncate text-sm font-medium" title={image.filename}>
          {image.filename}
        </p>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <StatusBadge status={image.status} />
          {image.width && image.height && (
            <span className="text-xs text-muted-foreground tabular-nums">
              {image.width}×{image.height}
            </span>
          )}
        </div>
      </div>

      {isReady && (
        <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button
                  variant="destructive"
                  size="icon"
                  className="size-8 shadow-md"
                  disabled={isDeleting}
                />
              }
            >
              <Trash2 className="size-3.5" />
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete image?</AlertDialogTitle>
                <AlertDialogDescription>
                  <span className="font-medium">{image.filename}</span> will be permanently removed.
                  This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(image.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      {isProcessing && (
        <div className="absolute inset-0 bg-background/10" />
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: ImageModel["status"] }) {
  if (status === "ready") return null
  return (
    <Badge
      variant="secondary"
      className={cn(
        "text-xs",
        status === "failed" && "border-destructive/30 bg-destructive/10 text-destructive",
        (status === "processing" || status === "pending") && "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
        status === "deleted" && "opacity-50"
      )}
    >
      {status === "pending" || status === "processing" ? (
        <><Clock className="mr-1 size-2.5" />{status}</>
      ) : status}
    </Badge>
  )
}

export function ImageCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-border/50">
      <Skeleton className="aspect-square w-full rounded-none" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/4" />
      </div>
    </div>
  )
}
