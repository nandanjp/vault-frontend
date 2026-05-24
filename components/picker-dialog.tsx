"use client"

import { useRef, useEffect } from "react"
import { Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogTitle,
} from "@/components/ui/dialog"

// Generic searchable picker dialog shell.
// Caller controls search state and provides filtered items.
// Footer slot accepts a confirm button or any additional actions.

export interface PickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  searchPlaceholder?: string
  emptyText?: string
  isLoading?: boolean
  search: string
  onSearchChange: (q: string) => void
  // Pagination
  page?: number
  totalPages?: number
  onPageChange?: (page: number) => void
  // Footer (confirm button, counts, etc.)
  footer?: React.ReactNode
  children: React.ReactNode
}

export function PickerDialog({
  open,
  onOpenChange,
  title,
  searchPlaceholder = "Search…",
  emptyText = "Nothing found.",
  isLoading,
  search,
  onSearchChange,
  page,
  totalPages,
  onPageChange,
  footer,
  children,
}: PickerDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80)
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <DialogTitle>{title}</DialogTitle>
          <DialogClose />
        </div>

        {/* Search */}
        <div className="border-b border-border px-3 py-2">
          <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-1.5">
            <Search className="size-3.5 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-3">
          {isLoading ? (
            <PickerSkeleton />
          ) : (
            children
          )}
        </div>

        {/* Pagination + footer */}
        {(onPageChange && totalPages && totalPages > 1) || footer ? (
          <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
            {onPageChange && totalPages && totalPages > 1 ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(Math.max(1, (page ?? 1) - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(Math.min(totalPages, (page ?? 1) + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            ) : <div />}
            {footer}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function PickerSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg px-2 py-2">
          <Skeleton className="size-10 shrink-0 rounded-lg" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

// Empty state used inside PickerDialog content
export function PickerEmpty({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  )
}
