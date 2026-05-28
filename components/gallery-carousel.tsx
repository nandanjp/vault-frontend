"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Heart, ImageIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { useToggleFavourite } from "@/hooks/use-favourites"
import type { Image as ImageModel } from "@/lib/api"
import gsap from "@/lib/gsap"
import { VaultImage } from "@/components/vault-image"
import { displaySrc } from "@/lib/display-src"

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
                gsap.fromTo(
                    nextEl,
                    { opacity: 0 },
                    { opacity: 1, duration: 0.55, ease: "power2.inOut" }
                )
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
            {images.map((image, i) => {
                const src = displaySrc(image)
                return (
                    <div
                        key={image.id}
                        ref={(el) => {
                            slidesRef.current[i] = el
                        }}
                        className="absolute inset-0"
                        style={{ opacity: i === 0 ? 1 : 0 }}
                    >
                        {/* Blurred background — decorative, hidden when no thumbnail available */}
                        {src && (
                            <div
                                className="absolute inset-0 overflow-hidden"
                                style={{
                                    filter: "blur(28px) brightness(0.35) saturate(1.2)",
                                    transform: "scale(1.1)",
                                }}
                            >
                                <VaultImage
                                    src={src}
                                    alt=""
                                    fill
                                    className="object-cover"
                                    aria-hidden
                                />
                            </div>
                        )}

                        {/* Foreground image — centered, contained */}
                        <Link
                            href={`/images/${image.id}`}
                            className="absolute inset-0 flex items-center justify-center p-8"
                        >
                            {src ? (
                                <VaultImage
                                    src={src}
                                    alt={image.filename}
                                    width={image.width ?? 1200}
                                    height={image.height ?? 900}
                                    className="max-h-full max-w-full object-contain drop-shadow-2xl select-none"
                                    priority={i === 0}
                                    draggable={false}
                                />
                            ) : (
                                <ImageIcon className="size-12 text-white/20" />
                            )}
                        </Link>
                    </div>
                )
            })}

            {/* Gradient caption bar */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent px-6 pt-16 pb-5">
                <p className="truncate text-sm font-medium text-white/90">{img.filename}</p>
                {img.width && img.height && (
                    <p className="mt-0.5 text-xs text-white/50 tabular-nums">
                        {img.width} × {img.height}
                    </p>
                )}
            </div>

            {/* Favourite button */}
            <button
                onClick={() => toggleFav.mutate({ id: img.id, isFav: !!img.is_favourited })}
                className="absolute top-4 right-4 flex size-9 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition-colors hover:bg-black/50"
            >
                <Heart className={cn("size-4", img.is_favourited && "fill-red-500 text-red-500")} />
            </button>

            {/* Prev / Next */}
            {images.length > 1 && (
                <>
                    <button
                        onClick={() => goTo((current - 1 + images.length) % images.length)}
                        className="absolute top-1/2 left-3 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition-colors hover:bg-black/50"
                    >
                        <ChevronLeft className="size-5" />
                    </button>
                    <button
                        onClick={() => goTo((current + 1) % images.length)}
                        className="absolute top-1/2 right-3 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition-colors hover:bg-black/50"
                    >
                        <ChevronRight className="size-5" />
                    </button>
                </>
            )}

            {/* Dot indicators */}
            {images.length > 1 && (
                <div className="absolute right-6 bottom-5 flex items-center gap-1.5">
                    {images.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => goTo(i)}
                            className={cn(
                                "h-1.5 rounded-full transition-all duration-300",
                                i === current
                                    ? "w-5 bg-white"
                                    : "w-1.5 bg-white/40 hover:bg-white/70"
                            )}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
