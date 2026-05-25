"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Heart } from "lucide-react"
import { cn } from "@/lib/utils"
import { useToggleFavourite } from "@/hooks/use-favourites"
import type { Image as ImageModel } from "@/lib/api"
import gsap from "@/lib/gsap"
import { VaultImage } from "@/components/vault-image"

const AUTOPLAY_MS = 5000

interface GalleryCarouselProps {
  images: ImageModel[]
}

export function GalleryCarousel({ images }: GalleryCarouselProps) {
  const [current, setCurrent] = useState(0)
  const prevRef = useRef<number | null>(null)
  const slidesRef = useRef<(HTMLDivElement | null)[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const toggleFav = useToggleFavourite()

  // Set initial GSAP states
  useEffect(() => {
    slidesRef.current.forEach((el, i) => {
      if (!el) return
      gsap.set(el, { opacity: i === 0 ? 1 : 0 })
    })
  }, [images])

  // Entry animation
  useEffect(() => {
    if (!containerRef.current) return
    gsap.fromTo(
      containerRef.current,
      { opacity: 0, y: 24 },
      { opacity: 1, y: 0, duration: 0.55, ease: "power2.out", delay: 0.05 }
    )
  }, [])

  const goTo = useCallback(
    (next: number) => {
      if (next === current) return
      const prevEl = slidesRef.current[current]
      const nextEl = slidesRef.current[next]
      if (prevEl && nextEl) {
        gsap.to(prevEl, { opacity: 0, duration: 0.55, ease: "power2.inOut" })
        gsap.fromTo(nextEl, { opacity: 0 }, { opacity: 1, duration: 0.55, ease: "power2.inOut" })
      }
      prevRef.current = current
      setCurrent(next)
    },
    [current]
  )

  // Autoplay
  useEffect(() => {
    if (images.length <= 1) return
    const id = setInterval(() => goTo((current + 1) % images.length), AUTOPLAY_MS)
    return () => clearInterval(id)
  }, [current, images.length, goTo])

  if (!images.length) return null

  const img = images[current]

  return (
    <div
      ref={containerRef}
      className="relative h-[480px] w-full overflow-hidden rounded-2xl bg-black"
    >
      {images.map((image, i) => (
        <div
          key={image.id}
          ref={(el) => { slidesRef.current[i] = el }}
          className="absolute inset-0"
          style={{ opacity: i === 0 ? 1 : 0 }}
        >
          {/* Blurred background — fills the container regardless of image orientation */}
          {image.url && (
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ filter: "blur(28px) brightness(0.35) saturate(1.2)", transform: "scale(1.1)" }}
            >
              <VaultImage src={image.url} alt="" fill className="object-cover" aria-hidden />
            </div>
          )}

          {/* Foreground image — centered, contained */}
          <Link
            href={`/images/${image.id}`}
            className="absolute inset-0 flex items-center justify-center p-8"
          >
            {image.url && (
              <VaultImage
                src={image.url}
                alt={image.filename}
                width={image.width ?? 1200}
                height={image.height ?? 900}
                className="max-h-full max-w-full object-contain drop-shadow-2xl select-none"
                priority={i === 0}
                draggable={false}
              />
            )}
          </Link>
        </div>
      ))}

      {/* Gradient caption bar */}
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent px-6 pb-5 pt-16 pointer-events-none">
        <p className="text-sm font-medium text-white/90 truncate">{img.filename}</p>
        {img.width && img.height && (
          <p className="text-xs text-white/50 mt-0.5 tabular-nums">
            {img.width} × {img.height}
          </p>
        )}
      </div>

      {/* Favourite button */}
      <button
        onClick={() => toggleFav.mutate({ id: img.id, isFav: !!img.is_favourited })}
        className="absolute top-4 right-4 flex size-9 items-center justify-center rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50 transition-colors"
      >
        <Heart
          className={cn("size-4", img.is_favourited && "fill-red-500 text-red-500")}
        />
      </button>

      {/* Prev / Next */}
      {images.length > 1 && (
        <>
          <button
            onClick={() => goTo((current - 1 + images.length) % images.length)}
            className="absolute left-3 top-1/2 -translate-y-1/2 flex size-10 items-center justify-center rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50 transition-colors"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            onClick={() => goTo((current + 1) % images.length)}
            className="absolute right-3 top-1/2 -translate-y-1/2 flex size-10 items-center justify-center rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50 transition-colors"
          >
            <ChevronRight className="size-5" />
          </button>
        </>
      )}

      {/* Dot indicators */}
      {images.length > 1 && (
        <div className="absolute bottom-5 right-6 flex items-center gap-1.5">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === current ? "w-5 bg-white" : "w-1.5 bg-white/40 hover:bg-white/70"
              )}
            />
          ))}
        </div>
      )}
    </div>
  )
}
