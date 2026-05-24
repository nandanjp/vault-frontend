"use client"

import { useState, useMemo } from "react"
import Image from "next/image"
import { FolderOpen } from "lucide-react"
import { PickerDialog, PickerEmpty } from "@/components/picker-dialog"
import { useAlbums, useAddToAlbum } from "@/hooks/use-albums"
import type { Album } from "@/lib/api"

interface AlbumPickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  imageId: string
}

export function AlbumPickerDialog({ open, onOpenChange, imageId }: AlbumPickerDialogProps) {
  const [search, setSearch] = useState("")
  const { data: albums, isLoading } = useAlbums()
  const addToAlbum = useAddToAlbum()

  const filtered = useMemo(() => {
    if (!albums) return []
    if (!search.trim()) return albums
    const q = search.toLowerCase()
    return albums.filter((a) => a.name.toLowerCase().includes(q))
  }, [albums, search])

  const handleSelect = (album: Album) => {
    addToAlbum.mutate(
      { albumId: album.id, imageIds: [imageId] },
      { onSuccess: () => onOpenChange(false) }
    )
  }

  return (
    <PickerDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add to album"
      searchPlaceholder="Search albums…"
      isLoading={isLoading}
      search={search}
      onSearchChange={setSearch}
    >
      {filtered.length === 0 ? (
        <PickerEmpty text={search ? "No albums match your search." : "No albums yet."} />
      ) : (
        <div className="space-y-0.5">
          {filtered.map((album) => (
            <button
              key={album.id}
              onClick={() => handleSelect(album)}
              disabled={addToAlbum.isPending}
              className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted disabled:opacity-50"
            >
              <div className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-muted">
                {album.cover_url ? (
                  <Image src={album.cover_url} alt={album.name} fill className="object-cover" unoptimized />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <FolderOpen className="size-5 text-muted-foreground/40" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{album.name}</p>
                <p className="text-xs text-muted-foreground">
                  {album.image_count} {album.image_count === 1 ? "photo" : "photos"}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </PickerDialog>
  )
}
