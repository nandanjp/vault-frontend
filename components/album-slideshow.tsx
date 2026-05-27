"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { X, ChevronLeft, ChevronRight, Maximize2, Minimize2, ImageIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Image as ImageModel } from "@/lib/api"
import gsap from "@/lib/gsap"
import { VaultImage } from "@/components/vault-image"
import { displaySrc } from "@/lib/display-src"

interface AlbumSlideshowProps {
  images: ImageModel[]
  initialIndex?: number
  onClose: () => void
}

export function AlbumSlideshow({ images, initialIndex = 0, onClose }: AlbumSlideshowProps) {
  const [current, setCurrent] = useState(initialIndex)
  const currentRef = useRef(initialIndex)
  const [expanded, setExpanded] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const thumbStripRef = useRef<HTMLDivElement>(null)
  const thumbBtnRefs = useRef<(HTMLButtonElement | null)[]>([])

  useEffect(() => { currentRef.current = current }, [current])

  // Entrance — fade overlay + pop modal
  useEffect(() => {
    if (overlayRef.current)
      gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: "power2.out" })
    if (modalRef.current)
      gsap.fromTo(modalRef.current, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: "power2.out" })
  }, [])

  // Auto-scroll selected thumbnail into view
  useEffect(() => {
    thumbBtnRefs.current[current]?.scrollIntoView({
      block: "nearest",
      inline: "center",
      behavior: "smooth",
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

  return (
    // Backdrop — full-screen on mobile, padded on sm+; click outside to close
    <div
      ref={overlayRef}
      style={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 sm:p-6 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Modal — full-screen on mobile, constrained on sm+ */}
      <div
        ref={modalRef}
        style={{ opacity: 0 }}
        className={cn(
          "relative flex flex-col overflow-hidden bg-black shadow-2xl",
          "w-full h-full sm:rounded-2xl",
          "sm:transition-[width,height] sm:duration-300 sm:ease-in-out",
          expanded
            ? "sm:h-[calc(100vh-48px)] sm:w-[calc(100vw-48px)]"
            : "sm:h-[min(88vh,680px)] sm:w-[min(90vw,920px)]"
        )}
      >
        {/* Controls — overlaid top-right on the carousel */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between px-4 pt-4">
          <span className="pointer-events-auto select-none text-sm tabular-nums text-white/50">
            {current + 1} / {images.length}
          </span>
          <div className="pointer-events-auto flex items-center gap-2">
            {/* Fullscreen — desktop only; on mobile the modal is already full-screen */}
            <button
              onClick={() => setExpanded((v) => !v)}
              className="hidden sm:flex size-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
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

        {/* Main carousel */}
        <div className="min-h-0 flex-1 overflow-hidden">
          <SlideshowCarousel images={images} current={current} onGoTo={goTo} />
        </div>

        {/* Thumbnail strip — horizontally scrollable, uniform height */}
        <div className="shrink-0 border-t border-white/10 bg-black/80 px-3 pt-4 pb-3">
          <div
            ref={thumbStripRef}
            className="flex gap-2 overflow-x-auto scrollbar-none"
          >
            {images.map((image, abs) => {
              const isSelected = abs === current
              const src = displaySrc(image)
              return (
                <button
                  key={image.id}
                  ref={(el) => { thumbBtnRefs.current[abs] = el }}
                  onClick={() => goTo(abs)}
                  className={cn(
                    "shrink-0 overflow-hidden rounded-xl border transition-all duration-150",
                    "h-14 aspect-[4/3]",
                    isSelected
                      ? "border-white/60 opacity-100 ring-2 ring-white shadow-md"
                      : "border-white/10 bg-white/5 opacity-45 hover:opacity-75 hover:border-white/25"
                  )}
                >
                  {src ? (
                    <VaultImage
                      src={src}
                      alt={image.filename}
                      width={107}
                      height={80}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <ImageIcon className="size-4 text-white/20" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// SlideshowCarousel — crossfade carousel without autoplay.
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

  // Re-initialise when images array grows (lazy load resolves)
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
      {images.map((image, i) => {
        const src = displaySrc(image)
        return (
          <div
            key={image.id}
            ref={(el) => { slidesRef.current[i] = el }}
            className="absolute inset-0"
            style={{ opacity: 0 }}
          >
            {/* Blurred background fill — decorative, hidden when no thumbnail available */}
            {src && (
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ filter: "blur(28px) brightness(0.35) saturate(1.2)", transform: "scale(1.1)" }}
              >
                <VaultImage src={src} alt="" fill className="object-cover" aria-hidden />
              </div>
            )}

            {/* Contained foreground image — p-6 gives breathing room from strip */}
            <div className="absolute inset-0 flex items-center justify-center p-6 sm:p-8">
              {src ? (
                <VaultImage
                  src={src}
                  alt={image.filename}
                  width={image.width ?? 1200}
                  height={image.height ?? 900}
                  className="max-h-full max-w-full select-none object-contain drop-shadow-2xl"
                  priority={i === 0}
                  draggable={false}
                />
              ) : (
                <ImageIcon className="size-12 text-white/20" />
              )}
            </div>
          </div>
        )
      })}

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

      {/* Caption gradient bar */}
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
