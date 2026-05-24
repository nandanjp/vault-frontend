"use client"

import { useState, useMemo } from "react"
import Image from "next/image"
import { Check, Images } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { PickerDialog, PickerEmpty } from "@/components/picker-dialog"
import { useMedia } from "@/hooks/use-media"
import { useAddToAlbum } from "@/hooks/use-albums"

const LIMIT = 24

interface PhotoPickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  albumId: string
}

export function PhotoPickerDialog({ open, onOpenChange, albumId }: PhotoPickerDialogProps) {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const { data, isLoading } = useMedia(page, LIMIT)
  const addToAlbum = useAddToAlbum()

  const readyPhotos = useMemo(() => {
    if (!data?.items) return []
    const items = data.items.filter((img) => img.status === "ready" && img.url)
    if (!search.trim()) return items
    const q = search.toLowerCase()
    return items.filter((img) => img.filename.toLowerCase().includes(q))
  }, [data, search])

  const totalPages = data ? Math.ceil(data.total / LIMIT) : 0

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleConfirm = () => {
    if (selectedIds.size === 0) return
    addToAlbum.mutate(
      { albumId, imageIds: Array.from(selectedIds) },
      { onSuccess: () => { setSelectedIds(new Set()); onOpenChange(false) } }
    )
  }

  const handleClose = (next: boolean) => {
    if (!next) { setSelectedIds(new Set()); setSearch("") }
    onOpenChange(next)
  }

  const selectedCount = selectedIds.size

  return (
    <PickerDialog
      open={open}
      onOpenChange={handleClose}
      title="Add photos to album"
      description="Tap photos to select them, then confirm."
      searchPlaceholder="Filter by filename…"
      isLoading={isLoading}
      search={search}
      onSearchChange={(q) => { setSearch(q); setPage(1) }}
      page={page}
      totalPages={totalPages}
      onPageChange={setPage}
      footer={
        <Button
          size="sm"
          onClick={handleConfirm}
          disabled={selectedCount === 0 || addToAlbum.isPending}
          className="gap-1.5"
        >
          <Images className="size-3.5" />
          {selectedCount > 0
            ? `Add ${selectedCount} ${selectedCount === 1 ? "photo" : "photos"}`
            : "Select photos"}
        </Button>
      }
    >
      {readyPhotos.length === 0 ? (
        <PickerEmpty text={search ? "No photos match your search." : "No photos yet."} />
      ) : (
        <div className="grid grid-cols-4 gap-2.5 pb-1">
          {readyPhotos.map((img) => {
            const selected = selectedIds.has(img.id)
            return (
              <button
                key={img.id}
                onClick={() => toggle(img.id)}
                className={cn(
                  "group relative aspect-square overflow-hidden rounded-xl bg-muted transition-all duration-150",
                  selected
                    ? "ring-2 ring-primary ring-offset-2 ring-offset-popover"
                    : "hover:opacity-90"
                )}
              >
                <Image
                  src={img.url!}
                  alt={img.filename}
                  fill
                  className="object-cover"
                  unoptimized
                />
                {/* Selection overlay */}
                <div
                  className={cn(
                    "absolute inset-0 flex items-center justify-center transition-opacity duration-150",
                    selected ? "bg-primary/25 opacity-100" : "opacity-0"
                  )}
                >
                  <div className="flex size-6 items-center justify-center rounded-full bg-primary shadow-md">
                    <Check className="size-3.5 text-primary-foreground" />
                  </div>
                </div>
                {/* Unselected checkmark circle */}
                {!selected && (
                  <div className="absolute right-1.5 top-1.5 size-5 rounded-full border-2 border-white/70 bg-black/20 opacity-0 transition-opacity group-hover:opacity-100" />
                )}
              </button>
            )
          })}
        </div>
      )}
    </PickerDialog>
  )
}
