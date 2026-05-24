"use client"

import { useState, useMemo } from "react"
import Image from "next/image"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { PickerDialog, PickerEmpty } from "@/components/picker-dialog"
import { useMedia } from "@/hooks/use-media"
import { useAddToAlbum } from "@/hooks/use-albums"

const LIMIT = 20

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

  const filtered = useMemo(() => {
    if (!data?.items) return []
    if (!search.trim()) return data.items
    const q = search.toLowerCase()
    return data.items.filter((img) => img.filename.toLowerCase().includes(q))
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
      {
        onSuccess: () => {
          setSelectedIds(new Set())
          onOpenChange(false)
        },
      }
    )
  }

  const handleClose = (next: boolean) => {
    if (!next) setSelectedIds(new Set())
    onOpenChange(next)
  }

  return (
    <PickerDialog
      open={open}
      onOpenChange={handleClose}
      title="Add photos"
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
          disabled={selectedIds.size === 0 || addToAlbum.isPending}
        >
          Add {selectedIds.size > 0 ? `${selectedIds.size} ` : ""}
          {selectedIds.size === 1 ? "photo" : "photos"}
        </Button>
      }
    >
      {filtered.length === 0 ? (
        <PickerEmpty text={search ? "No photos match your search." : "No photos yet."} />
      ) : (
        <div className="grid grid-cols-4 gap-1.5">
          {filtered
            .filter((img) => img.status === "ready" && img.url)
            .map((img) => {
              const selected = selectedIds.has(img.id)
              return (
                <button
                  key={img.id}
                  onClick={() => toggle(img.id)}
                  className={cn(
                    "group relative aspect-square overflow-hidden rounded-lg bg-muted transition-all",
                    selected && "ring-2 ring-primary ring-offset-1"
                  )}
                >
                  <Image
                    src={img.url!}
                    alt={img.filename}
                    fill
                    className="object-cover transition-transform duration-200 group-hover:scale-105"
                    unoptimized
                  />
                  {selected && (
                    <div className="absolute inset-0 flex items-center justify-center bg-primary/20">
                      <div className="flex size-5 items-center justify-center rounded-full bg-primary">
                        <Check className="size-3 text-primary-foreground" />
                      </div>
                    </div>
                  )}
                </button>
              )
            })}
        </div>
      )}
    </PickerDialog>
  )
}
