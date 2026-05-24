"use client"

import { useState } from "react"
import Link from "next/link"
import { Upload, Images } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"
import { ImageCard, ImageCardSkeleton } from "@/components/image-card"
import { useMedia, useDeleteMedia } from "@/hooks/use-media"

const LIMIT = 20

export default function DashboardPage() {
  const [page, setPage] = useState(1)
  const { data, isLoading, isError } = useMedia(page, LIMIT)
  const deleteMedia = useDeleteMedia()

  const totalPages = data ? Math.ceil(data.total / LIMIT) : 0

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Your images</h1>
          {data && (
            <p className="mt-1 text-sm text-muted-foreground">
              {data.total} {data.total === 1 ? "image" : "images"}
            </p>
          )}
        </div>
        <Link href="/upload" className={cn(buttonVariants({ size: "sm" }), "gap-2")}>
          <Upload className="size-4" />
          Upload
        </Link>
      </div>

      {isError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Failed to load images. Please try again.
        </div>
      )}

      {isLoading && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: LIMIT }).map((_, i) => (
            <ImageCardSkeleton key={i} />
          ))}
        </div>
      )}

      {!isLoading && data?.items.length === 0 && (
        <EmptyState />
      )}

      {!isLoading && data && data.items.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {data.items.map((image) => (
              <ImageCard
                key={image.id}
                image={image}
                onDelete={(id) => deleteMedia.mutate(id)}
                isDeleting={deleteMedia.isPending && deleteMedia.variables === image.id}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground tabular-nums">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-4 rounded-full border border-border/50 bg-muted p-6">
        <Images className="size-10 text-muted-foreground/60" />
      </div>
      <h2 className="text-lg font-medium">No images yet</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Upload your first image to get started.
      </p>
      <Link href="/upload" className={cn(buttonVariants(), "mt-6 gap-2")}>
        <Upload className="size-4" />
        Upload image
      </Link>
    </div>
  )
}
