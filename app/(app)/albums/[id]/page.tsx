"use client"

import { useState, useRef, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, ImagePlus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"
import { ImageCard, ImageCardSkeleton } from "@/components/image-card"
import { Skeleton } from "@/components/ui/skeleton"
import { useAlbums, useAlbumImages, useRemoveFromAlbum } from "@/hooks/use-albums"
import { useDeleteMedia } from "@/hooks/use-media"
import { PhotoPickerDialog } from "@/components/photo-picker-dialog"
import gsap from "@/lib/gsap"

const LIMIT = 20

export default function AlbumDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: albums } = useAlbums()
  const album = albums?.find((a) => a.id === id)
  const [page, setPage] = useState(1)
  const { data, isLoading } = useAlbumImages(id, page, LIMIT)
  const { data: heroData } = useAlbumImages(id, 1, 5)
  const removeFromAlbum = useRemoveFromAlbum()
  const deleteMedia = useDeleteMedia()
  const [addPhotosOpen, setAddPhotosOpen] = useState(false)

  const totalPages = data ? Math.ceil(data.total / LIMIT) : 0
  const heroImages = (heroData?.items.filter((i) => i.status === "ready" && i.url) ?? []) as BentoImg[]

  // Animated photo counter
  const countRef = useRef<HTMLSpanElement>(null)
  const countObj = useRef({ n: 0 })
  useEffect(() => {
    if (!countRef.current || !data) return
    gsap.to(countObj.current, {
      n: data.total,
      duration: 0.8,
      ease: "power2.out",
      onUpdate() {
        if (countRef.current) countRef.current.textContent = Math.round(countObj.current.n).toString()
      },
    })
  }, [data?.total])

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
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
                <span ref={countRef}>{data.total}</span>{" "}
                {data.total === 1 ? "photo" : "photos"}
              </p>
            )}
          </div>
        </div>

        <Button size="sm" className="shrink-0 gap-2" onClick={() => setAddPhotosOpen(true)}>
          <ImagePlus className="size-4" />
          Add photos
        </Button>
      </div>

      {/* Bento hero — first 5 images */}
      {heroImages.length > 0 && (
        <BentoHero images={heroImages} />
      )}

      {/* Image grid */}
      {isLoading && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 12 }).map((_, i) => <ImageCardSkeleton key={i} />)}
        </div>
      )}

      {!isLoading && data?.items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-muted-foreground">This album has no photos yet.</p>
          <Button className="mt-4 gap-2" size="sm" onClick={() => setAddPhotosOpen(true)}>
            <ImagePlus className="size-4" />
            Add photos
          </Button>
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
                <button
                  onClick={() => removeFromAlbum.mutate({ albumId: id, imageId: image.id })}
                  className="absolute bottom-11 left-2 hidden rounded-md bg-black/60 px-2 py-1 text-xs text-white backdrop-blur-sm hover:bg-black/80 group-hover/wrap:block transition-colors"
                >
                  Remove
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

      <PhotoPickerDialog
        open={addPhotosOpen}
        onOpenChange={setAddPhotosOpen}
        albumId={id}
      />
    </div>
  )
}

type BentoImg = { url: string; filename: string }

function BentoHero({ images }: { images: BentoImg[] }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ref.current) return
    const cells = ref.current.querySelectorAll("[data-bento]")
    gsap.fromTo(cells,
      { scale: 0.93, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.5, stagger: 0.07, ease: "power2.out" }
    )
  }, [])

  return (
    <div ref={ref} className="mb-8">
      <BentoGrid images={images} />
    </div>
  )
}

function BentoGrid({ images }: { images: BentoImg[] }) {
  const count = Math.min(images.length, 5)

  if (count === 1) {
    return (
      <div className="h-72 overflow-hidden rounded-2xl">
        <BentoCell img={images[0]} className="h-full w-full" />
      </div>
    )
  }

  if (count === 2) {
    return (
      <div className="grid h-72 grid-cols-2 gap-1 overflow-hidden rounded-2xl">
        <BentoCell img={images[0]} />
        <BentoCell img={images[1]} />
      </div>
    )
  }

  if (count === 3) {
    return (
      <div
        className="grid h-72 gap-1 overflow-hidden rounded-2xl"
        style={{ gridTemplateColumns: "3fr 2fr", gridTemplateRows: "1fr 1fr" }}
      >
        <BentoCell img={images[0]} className="row-span-2" />
        <BentoCell img={images[1]} />
        <BentoCell img={images[2]} />
      </div>
    )
  }

  if (count === 4) {
    return (
      <div className="grid h-72 grid-cols-2 grid-rows-2 gap-1 overflow-hidden rounded-2xl">
        {images.slice(0, 4).map((img, i) => <BentoCell key={i} img={img} />)}
      </div>
    )
  }

  // 5 images
  return (
    <div
      className="grid h-72 gap-1 overflow-hidden rounded-2xl"
      style={{ gridTemplateColumns: "2fr 1fr 1fr", gridTemplateRows: "1fr 1fr" }}
    >
      <BentoCell img={images[0]} className="row-span-2" />
      <BentoCell img={images[1]} />
      <BentoCell img={images[2]} />
      <BentoCell img={images[3]} />
      <BentoCell img={images[4]} />
    </div>
  )
}

function BentoCell({ img, className }: { img: BentoImg; className?: string }) {
  return (
    <div data-bento className={cn("relative overflow-hidden bg-muted", className)}>
      <Image
        src={img.url}
        alt={img.filename}
        fill
        className="object-cover transition-transform duration-500 hover:scale-105"
        unoptimized
      />
    </div>
  )
}
