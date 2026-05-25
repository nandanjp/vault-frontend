"use client"

import { useRef, useEffect } from "react"
import Link from "next/link"
import { Upload, FolderOpen, Heart, Images, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { ImageCardSkeleton } from "@/components/image-card"
import { GalleryCarousel } from "@/components/gallery-carousel"
import { Skeleton } from "@/components/ui/skeleton"
import { useGallery } from "@/hooks/use-gallery"
import { useAlbums } from "@/hooks/use-albums"
import { useFavourites } from "@/hooks/use-favourites"
import { VaultImage } from "@/components/vault-image"
import gsap from "@/lib/gsap"

export default function DashboardPage() {
  const { data: gallery, isLoading: galleryLoading } = useGallery()
  const { data: albums, isLoading: albumsLoading } = useAlbums()
  const { data: favourites, isLoading: favsLoading } = useFavourites(1, 8)

  const hasGallery = !galleryLoading && gallery && gallery.length > 0
  const hasAlbums = !albumsLoading && albums && albums.length > 0
  const hasFavs = !favsLoading && favourites && favourites.items.length > 0
  const isEmpty = !galleryLoading && !albumsLoading && !favsLoading
    && !hasGallery && !hasAlbums && !hasFavs

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-8 sm:px-6">
      {/* Gallery carousel */}
      {galleryLoading && (
        <Skeleton className="h-[480px] w-full rounded-2xl" />
      )}
      {hasGallery && <GalleryCarousel images={gallery!} />}

      {/* Favourites strip */}
      {(favsLoading || hasFavs) && (
        <Section
          title="Favourites"
          href="/favourites"
          icon={<Heart className="size-4" />}
          loading={favsLoading}
        >
          {favsLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <ImageCardSkeleton key={i} />
              ))
            : favourites!.items.map((img) => (
                <FavStrip key={img.id} image={img} />
              ))}
        </Section>
      )}

      {/* Albums grid */}
      {(albumsLoading || hasAlbums) && (
        <Section
          title="Albums"
          href="/albums"
          icon={<FolderOpen className="size-4" />}
          loading={albumsLoading}
        >
          {albumsLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <AlbumCardSkeleton key={i} />
              ))
            : albums!.map((album) => (
                <AlbumCard key={album.id} album={album} />
              ))}
        </Section>
      )}

      {/* Empty state */}
      {isEmpty && <EmptyState />}
    </div>
  )
}

function Section({
  title, href, icon, loading, children,
}: {
  title: string
  href: string
  icon: React.ReactNode
  loading: boolean
  children: React.ReactNode
}) {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    if (loading || !ref.current) return
    gsap.fromTo(ref.current,
      { opacity: 0, y: 16 },
      { opacity: 1, y: 0, duration: 0.45, ease: "power2.out" }
    )
  }, [loading])

  return (
    <section ref={ref}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          {icon}
          {title}
        </h2>
        <Link
          href={href}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1 text-muted-foreground")}
        >
          View all <ChevronRight className="size-3.5" />
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {children}
      </div>
    </section>
  )
}

function FavStrip({ image }: { image: { id: string; url?: string; filename: string; width?: number; height?: number } }) {
  return (
    <Link
      href={`/images/${image.id}`}
      className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-muted"
    >
      {image.url && (
        <VaultImage
          src={image.url}
          alt={image.filename}
          fill
          className="object-cover transition-[opacity,transform] duration-300 group-hover:scale-105"
        />
      )}
    </Link>
  )
}

function AlbumCard({ album }: { album: { id: string; name: string; image_count: number; cover_url?: string } }) {
  return (
    <Link
      href={`/albums/${album.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card hover:shadow-md transition-shadow"
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        {album.cover_url ? (
          <VaultImage
            src={album.cover_url}
            alt={album.name}
            fill
            className="object-cover transition-[opacity,transform] duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <FolderOpen className="size-8 text-muted-foreground/30" />
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="truncate text-sm font-medium">{album.name}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {album.image_count} {album.image_count === 1 ? "photo" : "photos"}
        </p>
      </div>
    </Link>
  )
}

function AlbumCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <Skeleton className="aspect-square w-full rounded-none" />
      <div className="space-y-1.5 p-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  )
}

function EmptyState() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ref.current) return
    gsap.fromTo(ref.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" })
  }, [])

  return (
    <div ref={ref} className="flex flex-col items-center justify-center py-28 text-center">
      <div className="mb-5 rounded-2xl border border-border bg-card p-7 shadow-sm">
        <Images className="size-12 text-muted-foreground/40" />
      </div>
      <h2 className="text-xl font-semibold">Welcome to vault</h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Upload your first photo to get started. Your gallery, albums, and favourites will appear here.
      </p>
      <Link href="/upload" className={cn(buttonVariants(), "mt-6 gap-2")}>
        <Upload className="size-4" />
        Upload your first photo
      </Link>
    </div>
  )
}
