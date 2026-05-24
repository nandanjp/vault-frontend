"use client"

import { useState } from "react"
import { Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ImageCard, ImageCardSkeleton } from "@/components/image-card"
import { useFavourites } from "@/hooks/use-favourites"
import { useDeleteMedia } from "@/hooks/use-media"

const LIMIT = 20

export default function FavouritesPage() {
  const [page, setPage] = useState(1)
  const { data, isLoading } = useFavourites(page, LIMIT)
  const deleteMedia = useDeleteMedia()

  const totalPages = data ? Math.ceil(data.total / LIMIT) : 0

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Favourites</h1>
        {data && data.total > 0 && (
          <p className="mt-1 text-sm text-muted-foreground">
            {data.total} {data.total === 1 ? "photo" : "photos"}
          </p>
        )}
      </div>

      {isLoading && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: LIMIT }).map((_, i) => <ImageCardSkeleton key={i} />)}
        </div>
      )}

      {!isLoading && data?.items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="mb-5 rounded-2xl border border-border bg-card p-6">
            <Heart className="size-10 text-muted-foreground/40" />
          </div>
          <h2 className="text-lg font-semibold">No favourites yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Open any photo and tap the heart icon to add it here.
          </p>
        </div>
      )}

      {!isLoading && data && data.items.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
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
