"use client"

import { useState, useMemo } from "react"
import { FolderOpen, Check, ImageIcon } from "lucide-react"
import { PickerDialog, PickerEmpty } from "@/components/picker-dialog"
import { useAlbums, useAddToAlbum } from "@/hooks/use-albums"
import { useMediaItem } from "@/hooks/use-media"
import { VaultImage } from "@/components/vault-image"
import { displaySrc } from "@/lib/display-src"
import type { Album } from "@/lib/api"

interface AlbumPickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  imageId: string
}

export function AlbumPickerDialog({ open, onOpenChange, imageId }: AlbumPickerDialogProps) {
  const [search, setSearch] = useState("")
  const { data: albums, isLoading } = useAlbums()
  const { data: image } = useMediaItem(imageId)
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
      { onSuccess: () => { setSearch(""); onOpenChange(false) } }
    )
  }

  const imgSrc = image ? displaySrc(image) : null
  const imagePreview = image ? (
    <div className="relative size-12 shrink-0 overflow-hidden rounded-lg border border-border/50 bg-muted shadow-sm">
      {imgSrc ? (
        <VaultImage src={imgSrc} alt={image.filename} fill className="object-cover" />
      ) : (
        <div className="flex h-full items-center justify-center">
          <ImageIcon className="size-5 text-muted-foreground/30" />
        </div>
      )}
    </div>
  ) : null

  return (
    <PickerDialog
      open={open}
      onOpenChange={(v) => { if (!v) setSearch(""); onOpenChange(v) }}
      title="Add to album"
      description={image ? image.filename : "Choose an album for this photo."}
      searchPlaceholder="Search albums…"
      isLoading={isLoading}
      search={search}
      onSearchChange={setSearch}
      headerSlot={imagePreview}
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
              className="flex w-full items-center gap-3.5 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-muted disabled:opacity-50"
            >
              <div className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-muted">
                {album.cover_url ? (
                  <VaultImage src={album.cover_url} alt={album.name} fill className="object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <FolderOpen className="size-5 text-muted-foreground/40" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{album.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {album.image_count} {album.image_count === 1 ? "photo" : "photos"}
                </p>
              </div>
              <Check className="size-4 shrink-0 text-muted-foreground/30" />
            </button>
          ))}
        </div>
      )}
    </PickerDialog>
  )
}
