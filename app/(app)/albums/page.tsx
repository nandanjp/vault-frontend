"use client"

import { useRef, useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { FolderOpen, FolderPlus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useAlbums, useAlbumImages, useCreateAlbum, useDeleteAlbum } from "@/hooks/use-albums"
import type { Album } from "@/lib/api"
import gsap from "@/lib/gsap"

export default function AlbumsPage() {
  const { data: albums, isLoading } = useAlbums()
  const createAlbum = useCreateAlbum()
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState("")

  const gridRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (isLoading || !gridRef.current) return
    const cards = gridRef.current.querySelectorAll<HTMLElement>("[data-card]")
    gsap.fromTo(cards,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.4, stagger: 0.06, ease: "power2.out" }
    )
  }, [isLoading])

  const handleCreate = () => {
    if (!newName.trim()) return
    createAlbum.mutate(
      { name: newName.trim() },
      { onSuccess: () => { setNewName(""); setShowCreate(false) } }
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Albums</h1>
          {albums && (
            <p className="mt-1 text-sm text-muted-foreground">
              {albums.length} {albums.length === 1 ? "album" : "albums"}
            </p>
          )}
        </div>
        <Button size="sm" className="gap-2" onClick={() => setShowCreate(true)}>
          <FolderPlus className="size-4" />
          New album
        </Button>
      </div>

      {/* Inline create form */}
      {showCreate && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-border bg-card p-4">
          <FolderOpen className="size-5 text-muted-foreground shrink-0" />
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") setShowCreate(false) }}
            placeholder="Album name…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <Button size="sm" onClick={handleCreate} disabled={!newName.trim() || createAlbum.isPending}>
            Create
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowCreate(false)}>
            Cancel
          </Button>
        </div>
      )}

      {isLoading && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <AlbumSkeleton key={i} />)}
        </div>
      )}

      {!isLoading && albums?.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="mb-5 rounded-2xl border border-border bg-card p-6">
            <FolderOpen className="size-10 text-muted-foreground/40" />
          </div>
          <h2 className="text-lg font-semibold">No albums yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Create an album to organise your photos.
          </p>
          <Button className="mt-5 gap-2" onClick={() => setShowCreate(true)}>
            <FolderPlus className="size-4" />
            Create your first album
          </Button>
        </div>
      )}

      {!isLoading && albums && albums.length > 0 && (
        <div ref={gridRef} className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {albums.map((album) => (
            <AlbumCard key={album.id} album={album} />
          ))}
        </div>
      )}
    </div>
  )
}

function AlbumCard({ album }: { album: Album }) {
  const deleteAlbum = useDeleteAlbum()
  const { data: images } = useAlbumImages(album.id, 1, 4)
  const thumbs = images?.items.filter((i) => i.status === "ready" && i.url) ?? []

  return (
    <div data-card className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card hover:shadow-md transition-shadow">
      <Link href={`/albums/${album.id}`} className="block">
        <div className="relative aspect-square overflow-hidden bg-muted">
          <AlbumCoverGrid thumbs={thumbs.map((i) => ({ url: i.url!, filename: i.filename }))} name={album.name} />
        </div>
        <div className="p-3">
          <p className="truncate text-sm font-medium">{album.name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {album.image_count} {album.image_count === 1 ? "photo" : "photos"}
          </p>
        </div>
      </Link>

      {/* Delete on hover */}
      <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button
                variant="destructive"
                size="icon"
                className="size-8 shadow-md"
                disabled={deleteAlbum.isPending}
              />
            }
          >
            <Trash2 className="size-3.5" />
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete album?</AlertDialogTitle>
              <AlertDialogDescription>
                <span className="font-medium">{album.name}</span> will be deleted. Your photos will not be affected.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteAlbum.mutate(album.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}

function AlbumCoverGrid({ thumbs, name }: { thumbs: { url: string; filename: string }[]; name: string }) {
  if (thumbs.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <FolderOpen className="size-10 text-muted-foreground/25" />
      </div>
    )
  }

  if (thumbs.length === 1) {
    return (
      <Image src={thumbs[0].url} alt={thumbs[0].filename} fill className="object-cover transition-transform duration-300 group-hover:scale-105" unoptimized />
    )
  }

  // 2-4 photos: 2×2 grid (empty slots get a muted bg)
  return (
    <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-px bg-border">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="relative overflow-hidden bg-muted">
          {thumbs[i] ? (
            <Image
              src={thumbs[i].url}
              alt={thumbs[i].filename}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              unoptimized
            />
          ) : null}
        </div>
      ))}
    </div>
  )
}

function AlbumSkeleton() {
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
