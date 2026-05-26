"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { X, ChevronLeft, ChevronRight, Maximize2, Minimize2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Image as ImageModel } from "@/lib/api"
import gsap from "@/lib/gsap"
import { VaultImage } from "@/components/vault-image"

const THUMB_PAGE = 6 // thumbnails visible in the strip at once

interface AlbumSlideshowProps {
  images: ImageModel[]
  initialIndex?: number
  onClose: () => void
}

export function AlbumSlideshow({ images, initialIndex = 0, onClose }: AlbumSlideshowProps) {
  const [current, setCurrent] = useState(initialIndex)
  const currentRef = useRef(initialIndex)
  const [expanded, setExpanded] = useState(false)
  const [thumbOffset, setThumbOffset] = useState(() =>
    Math.max(0, Math.min(initialIndex, images.length - THUMB_PAGE))
  )
  const overlayRef = useRef<HTMLDivElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => { currentRef.current = current }, [current])

  // Entrance — fade overlay + pop modal
  useEffect(() => {
    if (overlayRef.current)
      gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: "power2.out" })
    if (modalRef.current)
      gsap.fromTo(
        modalRef.current,
        { scale: 0.96, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.28, ease: "power2.out" }
      )
  }, [])

  // Keep thumbnail strip in sync with current slide
  useEffect(() => {
    setThumbOffset((o) => {
      if (current < o) return current
      if (current >= o + THUMB_PAGE) return current - THUMB_PAGE + 1
      return o
    })
  }, [current])

  const goTo = useCallback(
    (next: number) => {
      if (next === currentRef.current || !images.length) return
      setCurrent(next)
    },
    [images.length]
  )

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goTo((currentRef.current - 1 + images.length) % images.length)
      else if (e.key === "ArrowRight") goTo((currentRef.current + 1) % images.length)
      else if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [images.length, goTo, onClose])

  if (!images.length) return null

  const visibleThumbs = images.slice(thumbOffset, thumbOffset + THUMB_PAGE)
  const canLeft = thumbOffset > 0
  const canRight = thumbOffset + THUMB_PAGE < images.length

  return (
    // Backdrop — click outside to close
    <div
      ref={overlayRef}
      style={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-6 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Modal */}
      <div
        ref={modalRef}
        style={{ opacity: 0 }}
        className={cn(
          "relative flex flex-col overflow-hidden rounded-2xl bg-black shadow-2xl",
          "transition-[width,height] duration-300 ease-in-out",
          expanded
            ? "h-[calc(100vh-48px)] w-[calc(100vw-48px)]"
            : "h-[min(88vh,680px)] w-[min(90vw,920px)]"
        )}
      >
        {/* Controls — overlaid top-right on the carousel */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between px-4 pt-4">
          <span className="pointer-events-auto select-none text-sm tabular-nums text-white/50">
            {current + 1} / {images.length}
          </span>
          <div className="pointer-events-auto flex items-center gap-2">
            <button
              onClick={() => setExpanded((v) => !v)}
              className="flex size-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
            >
              {expanded ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
            </button>
            <button
              onClick={onClose}
              className="flex size-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>

        {/* Main carousel — mirrors GalleryCarousel */}
        <div className="min-h-0 flex-1 overflow-hidden">
          <SlideshowCarousel images={images} current={current} onGoTo={goTo} />
        </div>

        {/* Thumbnail card strip */}
        <div className="shrink-0 border-t border-white/10 bg-black/80 px-4 py-4">
          <div className="flex items-end justify-center gap-2">
            {/* Strip prev */}
            <button
              onClick={() => setThumbOffset((o) => Math.max(0, o - 1))}
              disabled={!canLeft}
              className="mb-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 disabled:pointer-events-none disabled:opacity-20"
            >
              <ChevronLeft className="size-4" />
            </button>

            {visibleThumbs.map((image, rel) => {
              const abs = thumbOffset + rel
              const isSelected = abs === current
              return (
                <button
                  key={image.id}
                  onClick={() => goTo(abs)}
                  className={cn(
                    "group shrink-0 overflow-hidden rounded-xl border transition-all duration-200",
                    isSelected
                      ? "h-20.5 w-20.5 border-white/50 opacity-100 ring-2 ring-white shadow-lg"
                      : "h-14.5 w-14.5 border-white/10 bg-white/5 opacity-45 hover:opacity-75 hover:border-white/25"
                  )}
                >
                  {(image.thumbnail_url ?? image.url) && (
                    <VaultImage
                      src={image.thumbnail_url ?? image.url!}
                      alt={image.filename}
                      width={82}
                      height={82}
                      className="h-full w-full object-cover"
                    />
                  )}
                </button>
              )
            })}

            {/* Strip next */}
            <button
              onClick={() => setThumbOffset((o) => Math.min(images.length - THUMB_PAGE, o + 1))}
              disabled={!canRight}
              className="mb-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 disabled:pointer-events-none disabled:opacity-20"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// SlideshowCarousel — identical visual pattern to GalleryCarousel on the
// dashboard but without autoplay or the favourite button.
// ---------------------------------------------------------------------------

interface SlideshowCarouselProps {
  images: ImageModel[]
  current: number
  onGoTo: (i: number) => void
}

function SlideshowCarousel({ images, current, onGoTo }: SlideshowCarouselProps) {
  const slidesRef = useRef<(HTMLDivElement | null)[]>([])
  const prevRef = useRef<number | null>(null)

  // Mount: initialise GSAP opacity for every slide
  useEffect(() => {
    slidesRef.current.forEach((el, i) => {
      if (el) gsap.set(el, { opacity: i === current ? 1 : 0 })
    })
    prevRef.current = current
  }, []) // intentionally mount-only; current is correct at mount time

  // Crossfade whenever current changes
  useEffect(() => {
    const prev = prevRef.current
    if (prev === null || prev === current) {
      prevRef.current = current
      return
    }
    const fromEl = slidesRef.current[prev]
    const toEl = slidesRef.current[current]
    if (fromEl) gsap.to(fromEl, { opacity: 0, duration: 0.45, ease: "power2.inOut" })
    if (toEl) gsap.fromTo(toEl, { opacity: 0 }, { opacity: 1, duration: 0.45, ease: "power2.inOut" })
    prevRef.current = current
  }, [current])

  // Re-initialise when all-images query resolves and adds more slides
  const currentSnap = useRef(current)
  useEffect(() => { currentSnap.current = current }, [current])
  useEffect(() => {
    slidesRef.current.forEach((el, i) => {
      if (el) gsap.set(el, { opacity: i === currentSnap.current ? 1 : 0 })
    })
  }, [images.length])

  const img = images[current]
  if (!img) return null

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      {images.map((image, i) => (
        <div
          key={image.id}
          ref={(el) => { slidesRef.current[i] = el }}
          className="absolute inset-0"
          style={{ opacity: 0 }}
        >
          {/* Blurred background fill — identical to GalleryCarousel */}
          {(image.thumbnail_url ?? image.url) && (
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ filter: "blur(28px) brightness(0.35) saturate(1.2)", transform: "scale(1.1)" }}
            >
              <VaultImage
                src={image.thumbnail_url ?? image.url!}
                alt=""
                fill
                className="object-cover"
                aria-hidden
              />
            </div>
          )}

          {/* Contained foreground image */}
          <div className="absolute inset-0 flex items-center justify-center p-8">
            {(image.thumbnail_url ?? image.url) && (
              <VaultImage
                src={image.thumbnail_url ?? image.url!}
                alt={image.filename}
                width={image.width ?? 1200}
                height={image.height ?? 900}
                className="max-h-full max-w-full select-none object-contain drop-shadow-2xl"
                priority={i === 0}
                draggable={false}
              />
            )}
          </div>
        </div>
      ))}

      {/* Prev / Next */}
      {images.length > 1 && (
        <>
          <button
            onClick={() => onGoTo((current - 1 + images.length) % images.length)}
            className="absolute left-3 top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition-colors hover:bg-black/50"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            onClick={() => onGoTo((current + 1) % images.length)}
            className="absolute right-3 top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition-colors hover:bg-black/50"
          >
            <ChevronRight className="size-5" />
          </button>
        </>
      )}

      {/* Caption gradient bar — identical to GalleryCarousel */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 via-black/20 to-transparent px-6 pb-4 pt-16">
        <p className="truncate text-sm font-medium text-white/90">{img.filename}</p>
        {img.width && img.height && (
          <p className="mt-0.5 tabular-nums text-xs text-white/50">
            {img.width} × {img.height}
          </p>
        )}
      </div>
    </div>
  )
}
