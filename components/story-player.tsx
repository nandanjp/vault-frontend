"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { X, Music, ChevronLeft, ChevronRight, Pause, Play, ImageIcon } from "lucide-react"

function MusicBars() {
    return (
        <div className="flex h-3 shrink-0 items-end gap-0.5">
            {[3, 5, 4, 3].map((h, i) => (
                <span
                    key={i}
                    className="w-0.5 rounded-full bg-emerald-400"
                    style={{
                        height: h * 2,
                        animation: `musicBar 0.8s ease-in-out ${i * 0.12}s infinite alternate`,
                    }}
                />
            ))}
        </div>
    )
}
import type { StorySlide, SpotifyTrack } from "@/lib/api"
import gsap from "@/lib/gsap"
import { VaultImage } from "@/components/vault-image"
import { displaySrc } from "@/lib/display-src"

interface StoryPlayerProps {
    slides: StorySlide[]
    initialIndex?: number
    onClose: () => void
    track?: SpotifyTrack
}

export function StoryPlayer({ slides, initialIndex = 0, onClose, track }: StoryPlayerProps) {
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
    const audioRef = useRef<HTMLAudioElement | null>(null)

    // Auto-play track preview and stop on unmount
    useEffect(() => {
        const audio = audioRef.current
        if (!track?.preview_url || !audio) return
        audio.volume = 0.7
        audio.play().catch(() => {})
        return () => {
            audio.pause()
        }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    // Pause / resume audio with story pause state
    useEffect(() => {
        if (!audioRef.current || !track?.preview_url) return
        if (paused) audioRef.current.pause()
        else audioRef.current.play().catch(() => {})
    }, [paused, track?.preview_url])

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
            if (curEl)
                gsap.to(curEl, { opacity: 0, scale: 0.94, duration: 0.38, ease: "power2.in" })
            if (nextEl)
                gsap.to(nextEl, { opacity: 1, scale: 1, duration: 0.42, ease: "power2.out" })
        } else {
            // fade (default)
            if (nextEl) gsap.set(nextEl, { opacity: 0, x: 0, scale: 1 })
            if (curEl) gsap.to(curEl, { opacity: 0, duration: 0.3, ease: "power2.in" })
            if (nextEl)
                gsap.to(nextEl, { opacity: 1, duration: 0.35, ease: "power2.out", delay: 0.08 })
        }

        setIdx(nextIdx)
    }, []) // stable — no deps

    // Stable — no deps
    const startProgress = useCallback(
        (slideIdx: number) => {
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
        },
        [navigateTo]
    ) // navigateTo is stable so this is too

    // Init once on mount — set initial visibility, start first progress
    useEffect(() => {
        slideEls.current.forEach((el, i) => {
            if (el) gsap.set(el, { opacity: i === initialIndex ? 1 : 0, x: 0, scale: 1 })
        })
        // Pre-fill bars for slides already "played" before the initial index
        progressEls.current.forEach((el, i) => {
            if (el) gsap.set(el, { scaleX: i < initialIndex ? 1 : 0 })
        })
        startProgress(initialIndex)
        return () => {
            progressTween.current?.kill()
        }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    // When idx changes via navigateTo → start next slide's progress
    // Skip first render (handled by init above)
    const isFirstRender = useRef(true)
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false
            return
        }
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
            else if (e.key === " ") {
                e.preventDefault()
                setPaused((p) => !p)
            } else if (e.key === "Escape") onCloseRef.current()
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
            {/* Hidden audio element for tracks that still have preview_url */}
            {track?.preview_url && (
                <audio ref={audioRef} src={track.preview_url} preload="auto" loop />
            )}
            <div className="absolute inset-0" onClick={onClose} />

            {/* Phone + music player stacked */}
            <div className="relative z-10 flex flex-col items-center gap-3">
                {/* Phone frame — 300×650 ≈ iPhone 16 aspect ratio (9:19.5) */}
                <div
                    className="relative w-75 h-[650px] overflow-hidden rounded-[42px] border-[5px] border-zinc-800 bg-zinc-950 shadow-[0_0_120px_rgba(0,0,0,0.9)]"
                >
                    {/* Notch */}
                    <div className="absolute top-3 left-1/2 z-30 h-[15px] w-20 -translate-x-1/2 rounded-full bg-zinc-800" />

                    {/* All slides stacked — loading="eager" on all so hidden slides pre-load */}
                    {slides.map((slide, i) => {
                        const src = displaySrc(slide)
                        return (
                            <div
                                key={slide.id}
                                ref={(el) => {
                                    slideEls.current[i] = el
                                }}
                                className="absolute inset-0"
                                style={{ opacity: i === initialIndex ? 1 : 0 }}
                            >
                                {src ? (
                                    <VaultImage
                                        src={src}
                                        alt={slide.filename}
                                        fill
                                        className="object-cover"
                                        loading="eager"
                                    />
                                ) : (
                                    <div className="flex h-full items-center justify-center bg-zinc-900">
                                        <ImageIcon className="size-10 text-zinc-600" />
                                    </div>
                                )}
                            </div>
                        )
                    })}

                    {/* Gradient overlays */}
                    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-40 bg-gradient-to-b from-black/70 to-transparent" />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-40 bg-gradient-to-t from-black/70 to-transparent" />

                    {/* Progress bars */}
                    <div className="absolute inset-x-3 top-9 z-30 flex gap-1">
                        {slides.map((_, i) => (
                            <div
                                key={i}
                                className="h-[2.5px] flex-1 overflow-hidden rounded-full bg-white/30"
                            >
                                <div
                                    ref={(el) => {
                                        progressEls.current[i] = el
                                    }}
                                    className="h-full origin-left rounded-full bg-white"
                                    style={{ transform: "scaleX(0)" }}
                                />
                            </div>
                        ))}
                    </div>

                    {/* Header chrome */}
                    <div className="absolute inset-x-3 top-[46px] z-30 flex items-center gap-2.5">
                        <div className="from-primary to-primary/60 flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ring-2 ring-white/20">
                            <span className="text-[11px] font-bold text-white">V</span>
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-[13px] leading-none font-semibold text-white">
                                vault
                            </p>
                            <p className="mt-0.5 text-[10px] text-white/50">now</p>
                        </div>
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                setPaused((p) => !p)
                            }}
                            className="flex size-7 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
                        >
                            {paused ? (
                                <Play className="size-3 fill-white" />
                            ) : (
                                <Pause className="size-3" />
                            )}
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                onClose()
                            }}
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
                        <div className="absolute inset-x-3 bottom-16 z-30 text-center">
                            <p className="text-[15px] leading-snug font-semibold text-white drop-shadow-lg">
                                {current.caption}
                            </p>
                        </div>
                    )}

                    {/* Music badge — animated bars when audio is playing */}
                    {track && (
                        <div className="absolute bottom-7 left-3 z-30 max-w-[calc(100%-24px)]">
                            <div className="flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 backdrop-blur-sm">
                                {!paused ? (
                                    <MusicBars />
                                ) : (
                                    <Music className="size-3 shrink-0 text-white/70" />
                                )}
                                <span className="truncate text-[11px] text-white/70">
                                    {track.name} · {track.artists[0]}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Spotify embed — plays 30s preview for any track */}
                {track && (
                    <div className="w-75 overflow-hidden rounded-2xl shadow-xl">
                        <iframe
                            key={track.id}
                            src={`https://open.spotify.com/embed/track/${track.id}?utm_source=generator&theme=0`}
                            width="300"
                            height="80"
                            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                            loading="eager"
                            style={{ border: "none", display: "block" }}
                        />
                    </div>
                )}
            </div>
            {/* end phone + music wrapper */}

            {/* External nav arrows */}
            <button
                onClick={() => navigateTo(idx - 1, -1)}
                disabled={idx === 0}
                className="absolute top-1/2 left-4 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-all hover:bg-white/20 disabled:opacity-0"
            >
                <ChevronLeft className="size-5" />
            </button>
            <button
                onClick={() => navigateTo(idx + 1, 1)}
                disabled={idx === slides.length - 1}
                className="absolute top-1/2 right-4 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-all hover:bg-white/20 disabled:opacity-0"
            >
                <ChevronRight className="size-5" />
            </button>

            {/* Slide counter */}
            <div className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 backdrop-blur-sm">
                <span className="text-xs text-white/70 tabular-nums">
                    {idx + 1} / {slides.length}
                </span>
            </div>
        </div>
    )
}
