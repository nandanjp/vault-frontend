"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import Link from "next/link"
import { ArrowRight, ImageIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Image as ImageModel } from "@/lib/api"
import { displaySrc } from "@/lib/display-src"

const PAGE_SIZE = 20

export default function LandingPage() {
    const [photos, setPhotos] = useState<ImageModel[]>([])
    const [total, setTotal] = useState<number | null>(null)
    const [loading, setLoading] = useState(false)
    const sentinelRef = useRef<HTMLDivElement>(null)
    const seenIds = useRef(new Set<string>())

    const loadMore = useCallback(async () => {
        if (loading) return
        if (total !== null && seenIds.current.size >= total) return
        setLoading(true)
        try {
            const res = await fetch(`/api/public/gallery?limit=${PAGE_SIZE}`)
            if (!res.ok) return
            const data = await res.json()
            const fresh = (data.items ?? []).filter(
                (p: ImageModel) => p.status === "ready" && p.url && !seenIds.current.has(p.id)
            )
            fresh.forEach((p: ImageModel) => seenIds.current.add(p.id))
            setPhotos((prev) => [...prev, ...fresh])
            setTotal(data.total ?? null)
        } finally {
            setLoading(false)
        }
    }, [loading, total])

    // Initial load
    useEffect(() => {
        loadMore()
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    // Infinite scroll via IntersectionObserver
    useEffect(() => {
        const el = sentinelRef.current
        if (!el) return
        const obs = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) loadMore()
            },
            { rootMargin: "400px" }
        )
        obs.observe(el)
        return () => obs.disconnect()
    }, [loadMore])

    const exhausted = total !== null && seenIds.current.size >= total

    return (
        <div className="bg-background text-foreground min-h-screen">
            <Nav />
            <Hero />
            <Discovery
                photos={photos}
                loading={loading}
                exhausted={exhausted}
                sentinelRef={sentinelRef}
            />
        </div>
    )
}

function Nav() {
    return (
        <header className="bg-background/80 border-border/40 fixed inset-x-0 top-0 z-50 flex items-center justify-between border-b px-6 py-4 backdrop-blur-md">
            <span className="text-lg font-bold tracking-tight">Vault</span>
            <nav className="flex items-center gap-2">
                <Link
                    href="/login"
                    className="text-muted-foreground hover:text-foreground rounded-lg px-4 py-1.5 text-sm transition-colors"
                >
                    Sign in
                </Link>
                <Link
                    href="/register"
                    className="bg-foreground text-background rounded-lg px-4 py-1.5 text-sm font-medium transition-opacity hover:opacity-80"
                >
                    Get started
                </Link>
            </nav>
        </header>
    )
}

function Hero() {
    return (
        <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 text-center">
            <div
                className="pointer-events-none absolute inset-0"
                style={{
                    background:
                        "radial-gradient(ellipse 80% 60% at 50% 20%, hsl(var(--primary)/0.08) 0%, transparent 70%)",
                }}
            />

            <Orb className="bg-primary/5 top-[20%] left-[10%] size-72" delay={0} />
            <Orb className="bg-primary/4 top-[35%] right-[8%] size-96" delay={1.2} />
            <Orb className="bg-primary/3 bottom-[15%] left-[25%] size-64" delay={0.6} />

            <div className="relative z-10 max-w-3xl">
                <div className="border-border/60 bg-muted/40 text-muted-foreground mb-5 inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs backdrop-blur-sm">
                    <span className="size-1.5 rounded-full bg-emerald-500" />
                    Self-hosted · Private · Yours forever
                </div>

                <h1 className="from-foreground to-foreground/60 bg-gradient-to-b bg-clip-text text-6xl font-bold tracking-tight text-transparent sm:text-7xl lg:text-8xl">
                    Your images,
                    <br />
                    beautifully stored.
                </h1>

                <p className="text-muted-foreground mx-auto mt-6 max-w-xl text-base sm:text-lg">
                    Vault is a private, self-hosted media vault. Upload, organise into albums,
                    curate stories, and rediscover your favourite moments — all under your control.
                </p>

                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                    <Link
                        href="/register"
                        className="group bg-foreground text-background flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-opacity hover:opacity-80"
                    >
                        Start for free
                        <ArrowRight className="size-4 transition-[transform,translate] group-hover:translate-x-0.5" />
                    </Link>
                    <Link
                        href="/login"
                        className="border-border text-foreground hover:bg-muted rounded-xl border px-6 py-3 text-sm font-medium transition-colors"
                    >
                        Sign in
                    </Link>
                </div>
            </div>

            <div className="text-muted-foreground/40 absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1.5">
                <span className="text-[11px] tracking-widest uppercase">Discover</span>
                <div className="from-muted-foreground/30 h-8 w-px bg-gradient-to-b to-transparent" />
            </div>
        </section>
    )
}

function Orb({ className, delay }: { className?: string; delay: number }) {
    return (
        <div
            className={cn("absolute rounded-full blur-3xl", className)}
            style={{ animation: `float 8s ease-in-out ${delay}s infinite` }}
        />
    )
}

interface DiscoveryProps {
    photos: ImageModel[]
    loading: boolean
    exhausted: boolean
    sentinelRef: React.RefObject<HTMLDivElement | null>
}

function Discovery({ photos, loading, exhausted, sentinelRef }: DiscoveryProps) {
    return (
        <section className="px-4 pb-24 sm:px-6">
            <div className="mx-auto max-w-7xl">
                <div className="mb-10 text-center">
                    <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Discover</h2>
                    <p className="text-muted-foreground mt-3">
                        A glimpse of what people are storing in their vaults.
                    </p>
                </div>

                {photos.length === 0 && !loading ? (
                    <EmptyDiscovery />
                ) : (
                    <>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                            {photos.map((photo) => (
                                <DiscoveryCard key={photo.id} photo={photo} />
                            ))}
                        </div>

                        {/* Sentinel + loading indicator */}
                        {!exhausted && (
                            <div ref={sentinelRef} className="mt-8 flex justify-center">
                                {loading && (
                                    <div className="text-muted-foreground flex items-center gap-2 text-sm">
                                        <span className="bg-muted-foreground/40 size-1.5 animate-bounce rounded-full [animation-delay:0ms]" />
                                        <span className="bg-muted-foreground/40 size-1.5 animate-bounce rounded-full [animation-delay:150ms]" />
                                        <span className="bg-muted-foreground/40 size-1.5 animate-bounce rounded-full [animation-delay:300ms]" />
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </section>
    )
}

function DiscoveryCard({ photo }: { photo: ImageModel }) {
    const [loaded, setLoaded] = useState(false)
    const src = displaySrc(photo)
    return (
        <div className="group bg-muted relative aspect-square overflow-hidden rounded-xl">
            {src ? (
                <>
                    {}
                    <img
                        src={src}
                        alt=""
                        loading="lazy"
                        onLoad={() => setLoaded(true)}
                        className={cn(
                            "absolute inset-0 h-full w-full object-cover transition-[opacity,scale] duration-500",
                            loaded ? "opacity-100 group-hover:scale-105" : "opacity-0"
                        )}
                    />
                    {!loaded && <div className="bg-muted absolute inset-0 animate-pulse" />}
                </>
            ) : (
                <div className="flex h-full items-center justify-center">
                    <ImageIcon className="text-muted-foreground/25 size-8" />
                </div>
            )}
        </div>
    )
}

function EmptyDiscovery() {
    return (
        <div className="border-border flex flex-col items-center justify-center rounded-2xl border border-dashed py-24 text-center">
            <p className="text-muted-foreground">No public photos yet — be the first to upload!</p>
            <Link
                href="/register"
                className="bg-foreground text-background mt-5 rounded-xl px-5 py-2.5 text-sm font-medium transition-opacity hover:opacity-80"
            >
                Create an account
            </Link>
        </div>
    )
}
