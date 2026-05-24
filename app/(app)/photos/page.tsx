"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { Upload, FolderPlus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"
import { ImageCard, ImageCardSkeleton } from "@/components/image-card"
import { AlbumPickerDialog } from "@/components/album-picker-dialog"
import { useMedia, useDeleteMedia } from "@/hooks/use-media"
import gsap, { ScrollTrigger } from "@/lib/gsap"

const LIMIT = 20

export default function PhotosPage() {
  const [page, setPage] = useState(1)
  const { data, isLoading, isError } = useMedia(page, LIMIT)
  const deleteMedia = useDeleteMedia()
  const [addToAlbumTarget, setAddToAlbumTarget] = useState<string | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  const totalPages = data ? Math.ceil(data.total / LIMIT) : 0
  const pendingCount = data?.items.filter(
    (i) => i.status === "pending" || i.status === "processing"
  ).length ?? 0

  // ScrollTrigger stagger as cards enter viewport
  useEffect(() => {
    if (isLoading || !gridRef.current) return
    const cards = gridRef.current.querySelectorAll<HTMLElement>("[data-card]")
    gsap.set(cards, { opacity: 0, y: 22 })

    const triggers = ScrollTrigger.batch(cards, {
      scroller: "#scroll-main",
      start: "top 92%",
      onEnter: (els) =>
        gsap.to(els, { opacity: 1, y: 0, duration: 0.45, stagger: 0.06, ease: "power2.out" }),
      once: true,
    })

    return () => triggers.forEach((t) => t.kill())
  }, [isLoading, data])

  // Collapse card then delete
  const handleDelete = (id: string) => {
    const wrapper = document.querySelector<HTMLElement>(`[data-card="${id}"]`)
    if (!wrapper) { deleteMedia.mutate(id); return }
    const h = wrapper.offsetHeight
    gsap.fromTo(
      wrapper,
      { height: h, overflow: "hidden" },
      {
        height: 0, opacity: 0, marginBottom: 0,
        duration: 0.32, ease: "power2.in",
        onComplete: () => deleteMedia.mutate(id),
      }
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">All photos</h1>
          {data && data.total > 0 && (
            <p className="mt-1 text-sm text-muted-foreground">
              {data.total} {data.total === 1 ? "photo" : "photos"}
              {pendingCount > 0 && (
                <span className="ml-2 text-amber-600 dark:text-amber-400">
                  · {pendingCount} processing
                </span>
              )}
            </p>
          )}
        </div>
        <Link href="/upload" className={cn(buttonVariants({ size: "sm" }), "shrink-0 gap-2")}>
          <Upload className="size-4" />
          Upload
        </Link>
      </div>

      {isError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Failed to load photos. Please try again.
        </div>
      )}

      {isLoading && (
        <div className="columns-2 gap-3 sm:columns-3 md:columns-4 lg:columns-5">
          {Array.from({ length: LIMIT }).map((_, i) => (
            <div key={i} className="mb-3 break-inside-avoid">
              <ImageCardSkeleton />
            </div>
          ))}
        </div>
      )}

      {!isLoading && data?.items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-muted-foreground">No photos yet.</p>
          <Link href="/upload" className={cn(buttonVariants(), "mt-4 gap-2")}>
            <Upload className="size-4" />
            Upload your first photo
          </Link>
        </div>
      )}

      {!isLoading && data && data.items.length > 0 && (
        <>
          <div ref={gridRef} className="columns-2 gap-3 sm:columns-3 md:columns-4 lg:columns-5">
            {data.items.map((image) => (
              <div
                key={image.id}
                data-card={image.id}
                className="group/wrap relative mb-3 break-inside-avoid"
              >
                <ImageCard
                  image={image}
                  natural
                  onDelete={handleDelete}
                  isDeleting={deleteMedia.isPending && deleteMedia.variables === image.id}
                />
                {image.status === "ready" && (
                  <button
                    onClick={() => setAddToAlbumTarget(image.id)}
                    className="absolute bottom-2 left-2 hidden items-center gap-1 rounded-md bg-black/60 px-2 py-1 text-xs text-white backdrop-blur-sm transition-colors hover:bg-black/80 group-hover/wrap:flex"
                  >
                    <FolderPlus className="size-3" />
                    Add to album
                  </button>
                )}
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

      {addToAlbumTarget && (
        <AlbumPickerDialog
          open
          onOpenChange={(open) => { if (!open) setAddToAlbumTarget(null) }}
          imageId={addToAlbumTarget}
        />
      )}
    </div>
  )
}
