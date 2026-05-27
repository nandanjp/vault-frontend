"use client"

import { useState } from "react"
import Link from "next/link"
import { Trash2, AlertCircle, Loader2, ImageIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { VaultImage } from "@/components/vault-image"
import { displaySrc } from "@/lib/display-src"

interface ImageCardProps {
  image: ImageModel
  onDelete?: (id: string) => void
  isDeleting?: boolean
  // natural=true → use real aspect ratio (masonry); false (default) → aspect-square
  natural?: boolean
  confirmTitle?: string
  confirmDescription?: string
  confirmLabel?: string
  // if provided, replaces the default Link→/images/[id] with a button click
  onView?: (id: string) => void
}

export function ImageCard({ image, onDelete, isDeleting, natural, confirmTitle = "Delete image?", confirmDescription, confirmLabel = "Delete", onView }: ImageCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false)
  const defaultDesc = `${image.filename} will be permanently deleted from storage and removed from all albums, stories, and favourites. This cannot be undone.`
  const resolvedDesc = confirmDescription ?? defaultDesc
  const isReady     = image.status === "ready"
  const isFailed    = image.status === "failed"
  const isPending   = image.status === "pending"
  const isProcessing = image.status === "processing"
  const canDelete   = isReady || isFailed || isPending
  const aspectStyle = natural && image.width && image.height
    ? { aspectRatio: `${image.width}/${image.height}` }
    : undefined

  const src = displaySrc(image)

  const imageArea = (
    <div
      className={cn("relative w-full overflow-hidden bg-muted", !natural && "aspect-square")}
      style={aspectStyle}
    >
      {isReady ? (
        src ? (
          <>
            <VaultImage
              src={src}
              alt={image.filename}
              width={image.width ?? 400}
              height={image.height ?? 400}
              onLoad={() => setImgLoaded(true)}
              className={cn("h-full w-full object-cover transition-[opacity,transform,scale] duration-300", imgLoaded && "group-hover:scale-105")}
              loading="lazy"
            />
            {/* Filename overlay — slides up on hover */}
            <div className="absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-black/75 to-transparent px-3 pb-2.5 pt-10 transition-[transform,translate] duration-300 ease-out group-hover:translate-y-0">
              <p className="truncate text-xs font-medium text-white/90">{image.filename}</p>
            </div>
          </>
        ) : (
          <div className="flex h-full min-h-[140px] flex-col items-center justify-center gap-2 text-muted-foreground">
            <ImageIcon className="size-8 opacity-40" />
          </div>
        )
      ) : isFailed ? (
        <div className="flex h-full min-h-[140px] flex-col items-center justify-center gap-2 text-muted-foreground">
          <AlertCircle className="size-8 text-destructive/60" />
          <span className="text-xs">Processing failed</span>
        </div>
      ) : (
        <div className="flex h-full min-h-[140px] flex-col items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="size-8 animate-spin opacity-40" />
          <span className="text-xs">Processing…</span>
        </div>
      )}

      {/* Status badge for non-ready images */}
      {!isReady && (
        <div className="absolute left-2 top-2">
          <StatusBadge status={image.status} />
        </div>
      )}

      {isProcessing && <div className="absolute inset-0 bg-background/10" />}
    </div>
  )

  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-card transition-all hover:shadow-md">
      {isReady ? (
        onView ? (
          <button onClick={() => onView(image.id)} className="block w-full text-left">
            {imageArea}
          </button>
        ) : (
          <Link href={`/images/${image.id}`} className="block">
            {imageArea}
          </Link>
        )
      ) : (
        imageArea
      )}

      {canDelete && onDelete && (
        <div
          className={cn(
            "absolute right-2 top-2 z-10 transition-opacity",
            isReady ? "opacity-0 group-hover:opacity-100" : "opacity-100"
          )}
        >
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
                <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
                <AlertDialogDescription>{resolvedDesc}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(image.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {confirmLabel}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
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
        (status === "processing" || status === "pending") &&
          "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
        status === "deleted" && "opacity-50"
      )}
    >
      {status}
    </Badge>
  )
}

export function ImageCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="aspect-square w-full animate-pulse bg-muted" />
    </div>
  )
}
