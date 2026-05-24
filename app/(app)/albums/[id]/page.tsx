"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"
import { ImageCard, ImageCardSkeleton } from "@/components/image-card"
import { Skeleton } from "@/components/ui/skeleton"
import { useAlbums, useAlbumImages, useRemoveFromAlbum } from "@/hooks/use-albums"
import { useDeleteMedia } from "@/hooks/use-media"

const LIMIT = 20

export default function AlbumDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: albums } = useAlbums()
  const album = albums?.find((a) => a.id === id)
  const [page, setPage] = useState(1)
  const { data, isLoading } = useAlbumImages(id, page, LIMIT)
  const removeFromAlbum = useRemoveFromAlbum()
  const deleteMedia = useDeleteMedia()

  const totalPages = data ? Math.ceil(data.total / LIMIT) : 0

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/albums" className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}>
            <ArrowLeft className="size-4" />
          </Link>
          <div className="min-w-0">
            {album
              ? <h1 className="truncate text-2xl font-semibold tracking-tight">{album.name}</h1>
              : <Skeleton className="h-7 w-48" />}
            {data && (
              <p className="mt-1 text-sm text-muted-foreground">
                {data.total} {data.total === 1 ? "photo" : "photos"}
              </p>
            )}
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 12 }).map((_, i) => <ImageCardSkeleton key={i} />)}
        </div>
      )}

      {!isLoading && data?.items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-muted-foreground">This album has no photos yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Go to a photo and use <span className="font-medium">Add to album</span> to add it here.
          </p>
        </div>
      )}

      {!isLoading && data && data.items.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {data.items.map((image) => (
              <div key={image.id} className="group/wrap relative">
                <ImageCard
                  image={image}
                  onDelete={(imgId) => deleteMedia.mutate(imgId)}
                  isDeleting={deleteMedia.isPending && deleteMedia.variables === image.id}
                />
                {/* Remove from album overlay */}
                <button
                  onClick={() => removeFromAlbum.mutate({ albumId: id, imageId: image.id })}
                  className="absolute bottom-11 left-2 hidden rounded-md bg-black/60 px-2 py-1 text-xs text-white backdrop-blur-sm hover:bg-black/80 group-hover/wrap:block transition-colors"
                >
                  Remove from album
                </button>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-3">
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
