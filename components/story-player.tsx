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

  // Keep everything in refs so GSAP callbacks never have stale closures.
  // This is the key fix — prev version depended on `slides` prop in useCallback
  // deps, causing startProgress to restart mid-animation every time the parent
  // re-rendered (e.g. during auto-save debounce).
  const slidesRef = useRef(slides)
  const onCloseRef = useRef(onClose)
  const idxRef = useRef(idx)
  const pausedRef = useRef(paused)
  slidesRef.current = slides
  onCloseRef.current = onClose
  idxRef.current = idx
  pausedRef.current = paused

  const slideEls = useRef<(HTMLDivElement | null)[]>([])
  const progressEls = useRef<(HTMLDivElement | null)[]>([])
  const progressTween = useRef<gsap.core.Tween | null>(null)

  // Stable — reads everything from refs, zero deps
  const navigateTo = useCallback((nextIdx: number, dir: 1 | -1) => {
    const ss = slidesRef.current
    if (nextIdx < 0 || nextIdx >= ss.length) return
    const curIdx = idxRef.current
    if (nextIdx === curIdx) return

    progressTween.current?.kill()

    // Reset all slides that aren't part of this transition
    slideEls.current.forEach((el, i) => {
      if (i !== curIdx && i !== nextIdx && el) {
        gsap.set(el, { opacity: 0, x: 0, scale: 1 })
      }
    })

    // Snap progress bars to correct filled state
    progressEls.current.forEach((el, i) => {
      if (el) gsap.set(el, { scaleX: i < nextIdx ? 1 : 0 })
    })

    const curEl = slideEls.current[curIdx]
    const nextEl = slideEls.current[nextIdx]
    const transition = ss[curIdx]?.transition ?? "fade"

    if (transition === "slide") {
      const toX = dir > 0 ? "-100%" : "100%"
      const fromX = dir > 0 ? "100%" : "-100%"
      if (nextEl) gsap.set(nextEl, { x: fromX, opacity: 1 })
      if (curEl) gsap.to(curEl, { x: toX, duration: 0.38, ease: "power2.inOut" })
      if (nextEl) gsap.to(nextEl, { x: "0%", duration: 0.38, ease: "power2.inOut" })
    } else if (transition === "zoom") {
      if (nextEl) gsap.set(nextEl, { opacity: 0, scale: 1.06, x: 0 })
      if (curEl) gsap.to(curEl, { opacity: 0, scale: 0.94, duration: 0.38, ease: "power2.in" })
      if (nextEl) gsap.to(nextEl, { opacity: 1, scale: 1, duration: 0.42, ease: "power2.out" })
    } else {
      // fade (default)
      if (nextEl) gsap.set(nextEl, { opacity: 0, x: 0, scale: 1 })
      if (curEl) gsap.to(curEl, { opacity: 0, duration: 0.3, ease: "power2.in" })
      if (nextEl) gsap.to(nextEl, { opacity: 1, duration: 0.35, ease: "power2.out", delay: 0.08 })
    }

    setIdx(nextIdx)
  }, []) // stable — no deps

  // Stable — no deps
  const startProgress = useCallback((slideIdx: number) => {
    const ss = slidesRef.current
    if (!ss[slideIdx]) return
    const bar = progressEls.current[slideIdx]
    if (!bar) return

    progressTween.current?.kill()
    gsap.set(bar, { scaleX: 0 })
    progressTween.current = gsap.to(bar, {
      scaleX: 1,
      duration: ss[slideIdx].duration_ms / 1000,
      ease: "none",
      onStart: () => {
        if (pausedRef.current) progressTween.current?.pause()
      },
      onComplete: () => {
        const next = idxRef.current + 1
        if (next >= slidesRef.current.length) {
          onCloseRef.current()
        } else {
          navigateTo(next, 1)
        }
      },
    })
  }, [navigateTo]) // navigateTo is stable so this is too

  // Init once on mount — set initial visibility, start first progress
  useEffect(() => {
    slideEls.current.forEach((el, i) => {
      if (el) gsap.set(el, { opacity: i === initialIndex ? 1 : 0, x: 0, scale: 1 })
    })
    progressEls.current.forEach((el) => {
      if (el) gsap.set(el, { scaleX: 0 })
    })
    startProgress(initialIndex)
    return () => { progressTween.current?.kill() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // When idx changes via navigateTo → start next slide's progress
  // Skip first render (handled by init above)
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    startProgress(idx)
  }, [idx, startProgress])

  // Pause / resume tween
  useEffect(() => {
    if (paused) progressTween.current?.pause()
    else progressTween.current?.resume()
  }, [paused])

  // Keyboard nav
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") navigateTo(idxRef.current + 1, 1)
      else if (e.key === "ArrowLeft") navigateTo(idxRef.current - 1, -1)
      else if (e.key === " ") { e.preventDefault(); setPaused((p) => !p) }
      else if (e.key === "Escape") onCloseRef.current()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [navigateTo])

  const handleTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    if (x < 0.35) navigateTo(idxRef.current - 1, -1)
    else if (x > 0.65) navigateTo(idxRef.current + 1, 1)
    else setPaused((p) => !p)
  }

  const current = slides[idx]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95">
      <div className="absolute inset-0" onClick={onClose} />

      {/* Phone frame */}
      <div
        className="relative z-10 overflow-hidden rounded-[44px] border-[6px] border-zinc-800 bg-zinc-950 shadow-[0_0_120px_rgba(0,0,0,0.9)]"
        style={{ width: 360, height: 640 }}
      >
        {/* Notch */}
        <div className="absolute left-1/2 top-3 z-30 h-[18px] w-24 -translate-x-1/2 rounded-full bg-zinc-800" />

        {/* All slides stacked — loading="eager" on all so hidden slides pre-load */}
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
                loading="eager"
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-zinc-900">
                <span className="text-sm text-zinc-600">No image</span>
              </div>
            )}
          </div>
        ))}

        {/* Gradient overlays */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-40 bg-gradient-to-b from-black/70 to-transparent" />
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
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold leading-none text-white">vault</p>
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
        <div className="absolute inset-0 z-20 flex" onClick={handleTap}>
          <div className="h-full w-[35%]" />
          <div className="h-full flex-1" />
          <div className="h-full w-[35%]" />
        </div>

        {/* Pause overlay */}
        {paused && (
          <div className="pointer-events-none absolute inset-0 z-[25] flex items-center justify-center">
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

        {/* Music badge */}
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
