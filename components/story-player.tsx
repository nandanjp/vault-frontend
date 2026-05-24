"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Image from "next/image"
import { X, Music, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react"
import { cn } from "@/lib/utils"
import type { StorySlide } from "@/lib/api"
import gsap from "@/lib/gsap"
import { shimmerPlaceholder } from "@/lib/image-placeholder"

interface StoryPlayerProps {
  slides: StorySlide[]
  initialIndex?: number
  onClose: () => void
}

export function StoryPlayer({ slides, initialIndex = 0, onClose }: StoryPlayerProps) {
  const [idx, setIdx] = useState(initialIndex)
  const [paused, setPaused] = useState(false)

  // Refs so GSAP callbacks see fresh values without stale closures
  const idxRef = useRef(idx)
  const pausedRef = useRef(paused)
  const slideEls = useRef<(HTMLDivElement | null)[]>([])
  const progressEls = useRef<(HTMLDivElement | null)[]>([])
  const progressTween = useRef<gsap.core.Tween | null>(null)

  idxRef.current = idx
  pausedRef.current = paused

  // Init: show only the first slide
  useEffect(() => {
    slideEls.current.forEach((el, i) => {
      if (el) gsap.set(el, { opacity: i === initialIndex ? 1 : 0, x: 0, scale: 1 })
    })
    progressEls.current.forEach((el) => {
      if (el) gsap.set(el, { scaleX: 0 })
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const startProgress = useCallback((slideIdx: number) => {
    const bar = progressEls.current[slideIdx]
    if (!bar || !slides[slideIdx]) return
    progressTween.current?.kill()
    gsap.set(bar, { scaleX: 0 })
    progressTween.current = gsap.to(bar, {
      scaleX: 1,
      duration: slides[slideIdx].duration_ms / 1000,
      ease: "none",
      paused: pausedRef.current,
      onComplete: () => {
        const next = idxRef.current + 1
        if (next >= slides.length) {
          onClose()
        } else {
          navigateTo(next, 1)
        }
      },
    })
  }, [slides, onClose]) // eslint-disable-line react-hooks/exhaustive-deps

  // Start progress when idx changes
  useEffect(() => {
    startProgress(idx)
    return () => { progressTween.current?.kill() }
  }, [idx, startProgress])

  // Pause / resume
  useEffect(() => {
    if (paused) {
      progressTween.current?.pause()
    } else {
      progressTween.current?.resume()
    }
  }, [paused])

  const navigateTo = useCallback((nextIdx: number, dir: 1 | -1) => {
    if (nextIdx < 0 || nextIdx >= slides.length) return
    const curIdx = idxRef.current
    progressTween.current?.kill()

    // Sync progress bars
    progressEls.current.forEach((el, i) => {
      if (!el) return
      gsap.set(el, { scaleX: i < nextIdx ? 1 : 0 })
    })

    // Hide non-participating slides
    slideEls.current.forEach((el, i) => {
      if (i !== curIdx && i !== nextIdx && el) {
        gsap.set(el, { opacity: 0, x: 0, scale: 1 })
      }
    })

    const curEl = slideEls.current[curIdx]
    const nextEl = slideEls.current[nextIdx]
    const transition = slides[curIdx]?.transition ?? "fade"

    if (transition === "fade") {
      if (curEl) gsap.to(curEl, { opacity: 0, duration: 0.35, ease: "power2.in" })
      if (nextEl) gsap.fromTo(nextEl, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: "power2.out" })
    } else if (transition === "slide") {
      const toX = dir > 0 ? "-100%" : "100%"
      const fromX = dir > 0 ? "100%" : "-100%"
      if (curEl) gsap.to(curEl, { x: toX, duration: 0.4, ease: "power2.inOut" })
      if (nextEl) gsap.fromTo(nextEl, { opacity: 1, x: fromX }, { x: "0%", duration: 0.4, ease: "power2.inOut" })
    } else {
      // zoom
      if (curEl) gsap.to(curEl, { opacity: 0, scale: 0.94, duration: 0.4, ease: "power2.in" })
      if (nextEl) gsap.fromTo(nextEl, { opacity: 0, scale: 1.06 }, { opacity: 1, scale: 1, duration: 0.45, ease: "power2.out" })
    }

    setIdx(nextIdx)
  }, [slides])

  const handleTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    if (x < 0.35) navigateTo(idxRef.current - 1, -1)
    else if (x > 0.65) navigateTo(idxRef.current + 1, 1)
    else setPaused((p) => !p)
  }

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") navigateTo(idxRef.current + 1, 1)
      else if (e.key === "ArrowLeft") navigateTo(idxRef.current - 1, -1)
      else if (e.key === " ") { e.preventDefault(); setPaused((p) => !p) }
      else if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [navigateTo, onClose])

  const current = slides[idx]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95">
      {/* Backdrop click to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Phone frame */}
      <div
        className="relative z-10 overflow-hidden rounded-[44px] border-[6px] border-zinc-800 bg-zinc-950 shadow-[0_0_120px_rgba(0,0,0,0.9)]"
        style={{ width: 340, height: 604 }}
      >
        {/* Notch */}
        <div className="absolute left-1/2 top-3 z-30 h-[18px] w-24 -translate-x-1/2 rounded-full bg-zinc-800" />

        {/* Slide images — all stacked, GSAP manages visibility */}
        {slides.map((slide, i) => (
          <div
            key={slide.id}
            ref={(el) => { slideEls.current[i] = el }}
            className="absolute inset-0"
            style={{ opacity: i === initialIndex ? 1 : 0 }}
          >
            {slide.url ? (
              <Image
                src={slide.url}
                alt={slide.filename}
                fill
                placeholder="blur"
                blurDataURL={shimmerPlaceholder}
                className="object-cover"
                unoptimized
                priority={i === initialIndex}
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-zinc-900">
                <span className="text-zinc-600 text-sm">No image</span>
              </div>
            )}
          </div>
        ))}

        {/* Gradient overlays */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-40 bg-gradient-to-b from-black/60 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-40 bg-gradient-to-t from-black/70 to-transparent" />

        {/* Progress bars */}
        <div className="absolute inset-x-4 top-10 z-30 flex gap-1">
          {slides.map((_, i) => (
            <div key={i} className="h-[2.5px] flex-1 overflow-hidden rounded-full bg-white/30">
              <div
                ref={(el) => { progressEls.current[i] = el }}
                className="h-full origin-left rounded-full bg-white"
                style={{ transform: "scaleX(0)" }}
              />
            </div>
          ))}
        </div>

        {/* Header chrome */}
        <div className="absolute inset-x-4 top-[52px] z-30 flex items-center gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 ring-2 ring-white/20">
            <span className="text-[11px] font-bold text-white">V</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-white leading-none">vault</p>
            <p className="mt-0.5 text-[10px] text-white/50">now</p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); setPaused((p) => !p) }}
            className="flex size-7 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
          >
            {paused ? <Play className="size-3 fill-white" /> : <Pause className="size-3" />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onClose() }}
            className="flex size-7 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
          >
            <X className="size-3.5" />
          </button>
        </div>

        {/* Tap zones */}
        <div className="absolute inset-0 z-20 flex" onClick={handleTap} style={{ cursor: "default" }}>
          <div className="h-full w-[35%]" />
          <div className="h-full flex-1" />
          <div className="h-full w-[35%]" />
        </div>

        {/* Pause overlay */}
        {paused && (
          <div className="pointer-events-none absolute inset-0 z-25 flex items-center justify-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm">
              <Pause className="size-6 text-white" />
            </div>
          </div>
        )}

        {/* Caption */}
        {current?.caption && (
          <div className="absolute inset-x-4 bottom-20 z-30 text-center">
            <p className="text-[15px] font-semibold leading-snug text-white drop-shadow-lg">
              {current.caption}
            </p>
          </div>
        )}

        {/* Music badge placeholder */}
        <div className="absolute bottom-8 left-4 z-30">
          <div className="flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 backdrop-blur-sm">
            <Music className="size-3 text-white/70" />
            <span className="text-[11px] text-white/70">Add music</span>
          </div>
        </div>
      </div>

      {/* External nav arrows */}
      <button
        onClick={() => navigateTo(idx - 1, -1)}
        disabled={idx === 0}
        className="absolute left-4 top-1/2 z-10 -translate-y-1/2 flex size-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-all hover:bg-white/20 disabled:opacity-0"
      >
        <ChevronLeft className="size-5" />
      </button>
      <button
        onClick={() => navigateTo(idx + 1, 1)}
        disabled={idx === slides.length - 1}
        className="absolute right-4 top-1/2 z-10 -translate-y-1/2 flex size-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-all hover:bg-white/20 disabled:opacity-0"
      >
        <ChevronRight className="size-5" />
      </button>

      {/* Slide counter */}
      <div className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 backdrop-blur-sm">
        <span className="text-xs tabular-nums text-white/70">{idx + 1} / {slides.length}</span>
      </div>
    </div>
  )
}
