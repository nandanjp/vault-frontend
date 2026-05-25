"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ArrowRight, Lock, Zap, Globe } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Image as ImageModel } from "@/lib/api"

export default function LandingPage() {
  const [photos, setPhotos] = useState<ImageModel[]>([])

  useEffect(() => {
    fetch("/api/public/gallery")
      .then((r) => r.ok ? r.json() : { items: [] })
      .then((d) => setPhotos(d.items ?? []))
      .catch(() => {})
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <Hero />
      <Features />
      <Discovery photos={photos} />
      <Footer />
    </div>
  )
}

function Nav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 flex items-center justify-between px-6 py-4 backdrop-blur-md bg-background/80 border-b border-border/40">
      <span className="text-lg font-bold tracking-tight">Vault</span>
      <nav className="flex items-center gap-2">
        <Link
          href="/login"
          className="rounded-lg px-4 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Sign in
        </Link>
        <Link
          href="/register"
          className="rounded-lg bg-foreground px-4 py-1.5 text-sm font-medium text-background transition-opacity hover:opacity-80"
        >
          Get started
        </Link>
      </nav>
    </header>
  )
}

function Hero() {
  const headingRef = useRef<HTMLHeadingElement>(null)

  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 text-center">
      {/* Subtle radial gradient backdrop */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 20%, hsl(var(--primary)/0.08) 0%, transparent 70%)",
        }}
      />

      {/* Floating orbs */}
      <Orb className="left-[10%] top-[20%] size-72 bg-primary/5" delay={0} />
      <Orb className="right-[8%] top-[35%] size-96 bg-primary/4" delay={1.2} />
      <Orb className="left-[25%] bottom-[15%] size-64 bg-primary/3" delay={0.6} />

      <div className="relative z-10 max-w-3xl">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-3.5 py-1.5 text-xs text-muted-foreground backdrop-blur-sm">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          Self-hosted · Private · Yours forever
        </div>

        <h1
          ref={headingRef}
          className="bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-6xl font-bold tracking-tight text-transparent sm:text-7xl lg:text-8xl"
        >
          Your images,
          <br />
          beautifully stored.
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-base text-muted-foreground sm:text-lg">
          Vault is a private, self-hosted media vault. Upload, organise into albums, curate stories,
          and rediscover your favourite moments — all under your control.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/register"
            className="group flex items-center gap-2 rounded-xl bg-foreground px-6 py-3 text-sm font-semibold text-background transition-opacity hover:opacity-80"
          >
            Start for free
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/login"
            className="rounded-xl border border-border px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Sign in
          </Link>
        </div>
      </div>

      {/* Scroll hint */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-muted-foreground/40">
        <span className="text-[11px] uppercase tracking-widest">Discover</span>
        <div className="h-8 w-px bg-gradient-to-b from-muted-foreground/30 to-transparent" />
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

function Features() {
  const items = [
    {
      icon: Lock,
      title: "Fully private",
      body: "Your images live on your own infrastructure. No third-party cloud, no tracking.",
    },
    {
      icon: Zap,
      title: "Instant delivery",
      body: "MinIO-backed object storage with presigned URLs means blazing-fast image delivery.",
    },
    {
      icon: Globe,
      title: "Rich organisation",
      body: "Albums, favourites, and animated stories — every way you'd want to organise your library.",
    },
  ]

  return (
    <section className="mx-auto max-w-5xl px-6 py-24">
      <div className="grid gap-6 sm:grid-cols-3">
        {items.map(({ icon: Icon, title, body }) => (
          <div
            key={title}
            className="rounded-2xl border border-border/60 bg-card/50 p-6 backdrop-blur-sm"
          >
            <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-primary/10">
              <Icon className="size-5 text-primary" />
            </div>
            <h3 className="mb-2 font-semibold">{title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function Discovery({ photos }: { photos: ImageModel[] }) {
  const ready = photos.filter((p) => p.status === "ready" && p.url)

  return (
    <section className="px-4 pb-24 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Discover</h2>
          <p className="mt-3 text-muted-foreground">
            A glimpse of what people are storing in their vaults.
          </p>
        </div>

        {ready.length === 0 ? (
          <EmptyDiscovery />
        ) : (
          <MasonryGrid photos={ready} />
        )}
      </div>
    </section>
  )
}

function MasonryGrid({ photos }: { photos: ImageModel[] }) {
  return (
    <div className="columns-2 gap-3 sm:columns-3 md:columns-4 lg:columns-5">
      {photos.map((photo) => (
        <DiscoveryCard key={photo.id} photo={photo} />
      ))}
    </div>
  )
}

function DiscoveryCard({ photo }: { photo: ImageModel }) {
  const [loaded, setLoaded] = useState(false)
  const aspectStyle =
    photo.width && photo.height
      ? { aspectRatio: `${photo.width}/${photo.height}` }
      : { aspectRatio: "1/1" }

  return (
    <div className="group mb-3 break-inside-avoid overflow-hidden rounded-xl bg-muted">
      <div className="relative overflow-hidden" style={aspectStyle}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.url!}
          alt=""
          loading="lazy"
          onLoad={() => setLoaded(true)}
          className={cn(
            "w-full object-cover transition-[opacity,transform,scale] duration-500 group-hover:scale-105",
            loaded ? "opacity-100" : "opacity-0"
          )}
        />
        {!loaded && <div className="absolute inset-0 animate-pulse bg-muted" />}
      </div>
    </div>
  )
}

function EmptyDiscovery() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-24 text-center">
      <p className="text-muted-foreground">No public photos yet — be the first to upload!</p>
      <Link
        href="/register"
        className="mt-5 rounded-xl bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-80"
      >
        Create an account
      </Link>
    </div>
  )
}

function Footer() {
  return (
    <footer className="border-t border-border/40 px-6 py-8 text-center text-xs text-muted-foreground/50">
      © {new Date().getFullYear()} Vault · Self-hosted image storage
    </footer>
  )
}
