"use client"

import { useState, useRef, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, ImagePlus, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"
import { ImageCard, ImageCardSkeleton } from "@/components/image-card"
import { Skeleton } from "@/components/ui/skeleton"
import { useAlbums, useAlbumImages, useRemoveFromAlbum, useUpdateAlbum } from "@/hooks/use-albums"
import { PhotoPickerDialog } from "@/components/photo-picker-dialog"
import { VaultImage } from "@/components/vault-image"
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
  const updateAlbum = useUpdateAlbum()
  const [addPhotosOpen, setAddPhotosOpen] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState("")
  const nameInputRef = useRef<HTMLInputElement>(null)

  const totalPages = data ? Math.ceil(data.total / LIMIT) : 0
  const heroImages = (heroData?.items.filter((i) => i.status === "ready" && i.url) ?? []) as BentoImg[]

  const startEdit = () => {
    setNameValue(album?.name ?? "")
    setEditingName(true)
    setTimeout(() => nameInputRef.current?.select(), 0)
  }

  const saveEdit = () => {
    const trimmed = nameValue.trim()
    if (trimmed && trimmed !== album?.name) {
      updateAlbum.mutate({ id, name: trimmed })
    }
    setEditingName(false)
  }

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
      {/* Breadcrumb */}
      <div className="mb-8 flex items-center justify-between">
        <Link
          href="/albums"
          className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Albums
        </Link>
        <Button size="sm" className="gap-2" onClick={() => setAddPhotosOpen(true)}>
          <ImagePlus className="size-4" />
          Add photos
        </Button>
      </div>

      {/* Hero title — Notion-style large editable heading */}
      <div className="mb-10">
        {album ? (
          <div className="group/title">
            {editingName ? (
              <input
                ref={nameInputRef}
                autoFocus
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onBlur={saveEdit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveEdit()
                  if (e.key === "Escape") setEditingName(false)
                }}
                className="w-full bg-transparent text-5xl font-bold tracking-tight outline-none sm:text-6xl border-b-2 border-primary pb-1 caret-primary"
              />
            ) : (
              <h1
                onClick={startEdit}
                title="Click to rename"
                className="cursor-text text-5xl font-bold tracking-tight sm:text-6xl leading-tight hover:opacity-80 transition-opacity"
              >
                {album.name}
              </h1>
            )}
            <div className="mt-3 flex items-center gap-3 text-sm text-muted-foreground">
              {data && (
                <span>
                  <span ref={countRef}>{data.total}</span>{" "}
                  {data.total === 1 ? "photo" : "photos"}
                </span>
              )}
              {album.created_at && (
                <>
                  <span className="size-1 rounded-full bg-muted-foreground/40 inline-block" />
                  <span>
                    Created{" "}
                    {new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(
                      new Date(album.created_at)
                    )}
                  </span>
                </>
              )}
              {!editingName && (
                <>
                  <span className="size-1 rounded-full bg-muted-foreground/40 inline-block" />
                  <button
                    onClick={startEdit}
                    className="text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                  >
                    Rename
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <Skeleton className="h-14 w-72" />
            <Skeleton className="h-4 w-40" />
          </div>
        )}
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
              <ImageCard
                key={image.id}
                image={image}
                onDelete={(imgId) => removeFromAlbum.mutate({ albumId: id, imageId: imgId })}
                isDeleting={removeFromAlbum.isPending}
                confirmTitle="Remove from album?"
                confirmDescription={`${image.filename} will be removed from this album but remain in your library.`}
                confirmLabel="Remove"
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
      <VaultImage
        src={img.url}
        alt={img.filename}
        fill
        className="object-cover transition-[opacity,transform,scale] duration-500 hover:scale-105"
      />
    </div>
  )
}
