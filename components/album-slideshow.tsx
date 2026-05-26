"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { X, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Image as ImageModel } from "@/lib/api"
import gsap from "@/lib/gsap"
import { VaultImage } from "@/components/vault-image"

interface AlbumSlideshowProps {
  images: ImageModel[]
  initialIndex?: number
  onClose: () => void
}

export function AlbumSlideshow({ images, initialIndex = 0, onClose }: AlbumSlideshowProps) {
  const [current, setCurrent] = useState(initialIndex)
  const currentRef = useRef(initialIndex)
  const slidesRef = useRef<(HTMLDivElement | null)[]>([])
  const filmRef = useRef<HTMLDivElement>(null)
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([])
  const overlayRef = useRef<HTMLDivElement>(null)

  // Keep ref in sync for use inside effects that don't re-run on current changes
  useEffect(() => {
    currentRef.current = current
  }, [current])

  // Entrance animation
  useEffect(() => {
    if (!overlayRef.current) return
    gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: "power2.out" })
  }, [])

  // Set initial GSAP slide opacities on mount
  useEffect(() => {
    slidesRef.current.forEach((el, i) => {
      if (!el) return
      gsap.set(el, { opacity: i === initialIndex ? 1 : 0 })
    })
  }, []) // mount only — initialIndex is correct at mount time

  // When images array grows (more pages loaded), initialise any new slide refs to 0
  useEffect(() => {
    slidesRef.current.forEach((el, i) => {
      if (!el) return
      gsap.set(el, { opacity: i === currentRef.current ? 1 : 0 })
    })
  }, [images.length])

  const goTo = useCallback(
    (next: number) => {
      if (next === currentRef.current || !images.length) return
      const from = slidesRef.current[currentRef.current]
      const to = slidesRef.current[next]
      if (from) gsap.to(from, { opacity: 0, duration: 0.4, ease: "power2.inOut" })
      if (to) gsap.fromTo(to, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: "power2.inOut" })
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

  // Auto-scroll filmstrip to keep current thumbnail visible
  useEffect(() => {
    const thumb = thumbRefs.current[current]
    if (thumb && filmRef.current) {
      thumb.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" })
    }
  }, [current])

  if (!images.length) return null

  const img = images[current]

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex flex-col bg-black"
      style={{ opacity: 0 }}
    >
      {/* Top bar */}
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5 py-4">
        <span className="text-sm tabular-nums text-white/50">
          {current + 1} / {images.length}
        </span>
        <button
          onClick={onClose}
          className="flex size-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
        >
          <X className="size-4.5" />
        </button>
      </div>

      {/* Main image area */}
      <div className="relative flex-1 overflow-hidden">
        {images.map((image, i) => (
          <div
            key={image.id}
            ref={(el) => { slidesRef.current[i] = el }}
            className="absolute inset-0 flex items-center justify-center p-10"
            style={{ opacity: 0 }}
          >
            {/* Blurred ambient background */}
            {(image.thumbnail_url ?? image.url) && (
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ filter: "blur(36px) brightness(0.18) saturate(1.4)", transform: "scale(1.12)" }}
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

            {/* Main image */}
            {(image.thumbnail_url ?? image.url) && (
              <VaultImage
                src={image.thumbnail_url ?? image.url!}
                alt={image.filename}
                width={image.width ?? 1200}
                height={image.height ?? 900}
                className="relative max-h-full max-w-full select-none object-contain drop-shadow-2xl"
                priority={i === initialIndex}
                draggable={false}
              />
            )}
          </div>
        ))}

        {/* Prev / Next */}
        {images.length > 1 && (
          <>
            <button
              onClick={() => goTo((current - 1 + images.length) % images.length)}
              className="absolute left-3 top-1/2 z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              <ChevronLeft className="size-6" />
            </button>
            <button
              onClick={() => goTo((current + 1) % images.length)}
              className="absolute right-3 top-1/2 z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              <ChevronRight className="size-6" />
            </button>
          </>
        )}

        {/* Caption */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-8 pb-4 pt-20">
          <p className="truncate text-sm font-medium text-white/90">{img.filename}</p>
          {img.width && img.height && (
            <p className="mt-0.5 tabular-nums text-xs text-white/50">
              {img.width} × {img.height}
            </p>
          )}
        </div>
      </div>

      {/* Filmstrip */}
      {images.length > 1 && (
        <div className="shrink-0 border-t border-white/10 bg-black/60 px-4 py-3">
          <div
            ref={filmRef}
            className="flex gap-2 overflow-x-auto"
            style={{ scrollbarWidth: "none" }}
          >
            {images.map((image, i) => (
              <button
                key={image.id}
                ref={(el) => { thumbRefs.current[i] = el }}
                onClick={() => goTo(i)}
                className={cn(
                  "shrink-0 overflow-hidden rounded-lg transition-all duration-200",
                  i === current
                    ? "h-20 w-20 ring-2 ring-white opacity-100"
                    : "h-14 w-14 opacity-40 hover:opacity-70"
                )}
              >
                {(image.thumbnail_url ?? image.url) && (
                  <VaultImage
                    src={image.thumbnail_url ?? image.url!}
                    alt={image.filename}
                    width={80}
                    height={80}
                    className="h-full w-full object-cover"
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
