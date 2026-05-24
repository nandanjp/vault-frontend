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

export interface PickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  searchPlaceholder?: string
  isLoading?: boolean
  search: string
  onSearchChange: (q: string) => void
  page?: number
  totalPages?: number
  onPageChange?: (page: number) => void
  footer?: React.ReactNode
  children: React.ReactNode
}

export function PickerDialog({
  open,
  onOpenChange,
  title,
  description,
  searchPlaceholder = "Search…",
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

  const hasPagination = onPageChange && totalPages && totalPages > 1
  const hasFooter = hasPagination || footer

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-0 p-0">
        {/* Header — no hard border, just generous padding */}
        <div className="flex items-start justify-between gap-3 px-5 pb-2 pt-5">
          <div className="min-w-0">
            <DialogTitle className="text-base">{title}</DialogTitle>
            {description && (
              <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          <DialogClose className="mt-0.5 shrink-0" />
        </div>

        {/* Search — floating inside content area */}
        <div className="px-5 pb-3">
          <div className="flex items-center gap-2.5 rounded-xl bg-muted/60 px-3.5 py-2.5 ring-1 ring-border/50">
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
        <div className="flex-1 overflow-y-auto px-5 pb-3">
          {isLoading ? <PickerSkeleton /> : children}
        </div>

        {/* Footer — subtle top separation only when content exists */}
        {hasFooter && (
          <div className="flex items-center justify-between gap-3 rounded-b-2xl bg-muted/40 px-5 py-3.5">
            {hasPagination ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange!(Math.max(1, (page ?? 1) - 1))}
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
                  onClick={() => onPageChange!(Math.min(totalPages!, (page ?? 1) + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            ) : <div />}
            {footer}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function PickerSkeleton() {
  return (
    <div className="space-y-1.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl px-3 py-2.5">
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

export function PickerEmpty({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  )
}
