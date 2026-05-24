"use client"

import { useState, useEffect, useRef, useCallback, useReducer } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import {
  ArrowLeft, Play, Plus, Trash2, GripVertical, ImageIcon, Music,
  Check, Images,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { PickerDialog, PickerEmpty } from "@/components/picker-dialog"
import { useStory, useUpdateStory } from "@/hooks/use-stories"
import { useMedia } from "@/hooks/use-media"
import { StoryPlayer } from "@/components/story-player"
import { shimmerPlaceholder } from "@/lib/image-placeholder"
import type { StorySlide, StoryTransition, SlideInput } from "@/lib/api"

// ---------- Draft types ----------

type DraftSlide = {
  tempId: string
  id?: string
  image_id: string
  url?: string
  filename: string
  width?: number
  height?: number
  duration_ms: number
  transition: StoryTransition
  caption: string
}

type Draft = { title: string; slides: DraftSlide[] }

type Action =
  | { type: "LOAD"; draft: Draft }
  | { type: "SET_TITLE"; title: string }
  | { type: "ADD_SLIDES"; images: SlideImage[] }
  | { type: "REMOVE_SLIDE"; tempId: string }
  | { type: "UPDATE_SLIDE"; tempId: string; patch: Partial<DraftSlide> }
  | { type: "MOVE_SLIDE"; from: number; to: number }

type SlideImage = { id: string; url?: string; filename: string; width?: number; height?: number }

function reducer(state: Draft, action: Action): Draft {
  switch (action.type) {
    case "LOAD": return action.draft
    case "SET_TITLE": return { ...state, title: action.title }
    case "ADD_SLIDES":
      return {
        ...state,
        slides: [
          ...state.slides,
          ...action.images.map((img) => ({
            tempId: `tmp-${Date.now()}-${img.id}`,
            image_id: img.id,
            url: img.url,
            filename: img.filename,
            width: img.width,
            height: img.height,
            duration_ms: 5000,
            transition: "fade" as StoryTransition,
            caption: "",
          })),
        ],
      }
    case "REMOVE_SLIDE":
      return { ...state, slides: state.slides.filter((s) => s.tempId !== action.tempId) }
    case "UPDATE_SLIDE":
      return {
        ...state,
        slides: state.slides.map((s) =>
          s.tempId === action.tempId ? { ...s, ...action.patch } : s
        ),
      }
    case "MOVE_SLIDE": {
      const slides = [...state.slides]
      const [moved] = slides.splice(action.from, 1)
      slides.splice(action.to, 0, moved)
      return { ...state, slides }
    }
    default: return state
  }
}

const TRANSITIONS: { value: StoryTransition; label: string }[] = [
  { value: "fade", label: "Fade" },
  { value: "slide", label: "Slide" },
  { value: "zoom", label: "Zoom" },
]

// ---------- Page ----------

export default function StoryEditPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: story, isLoading } = useStory(id)
  const updateStory = useUpdateStory()

  const [draft, dispatch] = useReducer(reducer, { title: "", slides: [] })
  const [activeIdx, setActiveIdx] = useState(0)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved")

  // Load story data into draft on first fetch
  const loaded = useRef(false)
  useEffect(() => {
    if (!story || loaded.current) return
    loaded.current = true
    dispatch({
      type: "LOAD",
      draft: {
        title: story.title,
        slides: story.slides.map((s) => ({
          tempId: s.id,
          id: s.id,
          image_id: s.image_id,
          url: s.url,
          filename: s.filename,
          width: s.width,
          height: s.height,
          duration_ms: s.duration_ms,
          transition: s.transition,
          caption: s.caption ?? "",
        })),
      },
    })
  }, [story])

  // Auto-save — debounced 800ms after any draft change
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const draftRef = useRef(draft)
  draftRef.current = draft

  const save = useCallback(() => {
    setSaveStatus("saving")
    const d = draftRef.current
    updateStory.mutate(
      {
        id,
        title: d.title,
        slides: d.slides.map((s) => ({
          image_id: s.image_id,
          duration_ms: s.duration_ms,
          transition: s.transition,
          caption: s.caption || undefined,
        } satisfies SlideInput)),
      },
      {
        onSuccess: () => setSaveStatus("saved"),
        onError: () => setSaveStatus("unsaved"),
      }
    )
  }, [id, updateStory])

  useEffect(() => {
    if (!loaded.current) return
    setSaveStatus("unsaved")
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(save, 800)
    return () => clearTimeout(saveTimer.current)
  }, [draft, save])

  const activeSlide = draft.slides[activeIdx] as DraftSlide | undefined

  const handleAddImages = (images: SlideImage[]) => {
    dispatch({ type: "ADD_SLIDES", images })
    setActiveIdx(draft.slides.length + images.length - 1)
  }

  const handleRemove = (tempId: string, i: number) => {
    dispatch({ type: "REMOVE_SLIDE", tempId })
    setActiveIdx((prev) => Math.min(prev, Math.max(0, draft.slides.length - 2)))
  }

  // Map draft slides → StorySlide for the player
  const playerSlides: StorySlide[] = draft.slides.map((s, i) => ({
    id: s.id ?? s.tempId,
    story_id: id,
    image_id: s.image_id,
    position: i,
    duration_ms: s.duration_ms,
    transition: s.transition,
    caption: s.caption || undefined,
    url: s.url,
    filename: s.filename,
    width: s.width,
    height: s.height,
  }))

  if (isLoading) return <BuilderSkeleton />

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4">
        <Link
          href="/stories"
          className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Stories
        </Link>
        <div className="mx-2 h-4 w-px bg-border" />
        <input
          value={draft.title}
          onChange={(e) => dispatch({ type: "SET_TITLE", title: e.target.value })}
          placeholder="Story title"
          className="flex-1 bg-transparent text-base font-semibold outline-none placeholder:text-muted-foreground/50"
        />
        <span className={cn(
          "text-xs transition-colors",
          saveStatus === "saving" && "text-muted-foreground",
          saveStatus === "saved" && "text-muted-foreground/50",
          saveStatus === "unsaved" && "text-amber-500",
        )}>
          {saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved" : "Unsaved"}
        </span>
        <Button
          size="sm"
          className="gap-2"
          onClick={() => setPlaying(true)}
          disabled={draft.slides.length === 0}
        >
          <Play className="size-3.5 fill-current" />
          Preview
        </Button>
      </div>

      {/* Three-column layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: slide strip */}
        <div className="flex w-[88px] shrink-0 flex-col overflow-y-auto border-r border-border bg-muted/20 p-2 gap-2">
          {draft.slides.map((slide, i) => (
            <SlideThumb
              key={slide.tempId}
              slide={slide}
              index={i}
              active={i === activeIdx}
              onSelect={() => setActiveIdx(i)}
              onRemove={() => handleRemove(slide.tempId, i)}
            />
          ))}
          <button
            onClick={() => setPickerOpen(true)}
            className="flex aspect-[9/16] w-full flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
          >
            <Plus className="size-5" />
            <span className="text-[10px] font-medium">Add</span>
          </button>
        </div>

        {/* Center: phone preview */}
        <div className="flex flex-1 flex-col items-center justify-center gap-6 overflow-hidden bg-muted/10 p-6">
          <PhonePreview slide={activeSlide} totalSlides={draft.slides.length} activeIdx={activeIdx} />
          {draft.slides.length === 0 && (
            <p className="text-sm text-muted-foreground">Add slides from the left panel to get started.</p>
          )}
        </div>

        {/* Right: slide config */}
        <div className="flex w-72 shrink-0 flex-col overflow-y-auto border-l border-border p-5">
          {activeSlide ? (
            <SlideConfig
              slide={activeSlide}
              index={activeIdx}
              total={draft.slides.length}
              onChange={(patch) => dispatch({ type: "UPDATE_SLIDE", tempId: activeSlide.tempId, patch })}
              onRemove={() => handleRemove(activeSlide.tempId, activeIdx)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3">
              <ImageIcon className="size-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Select a slide to configure it</p>
            </div>
          )}
        </div>
      </div>

      {/* Image picker dialog */}
      <StoryImagePicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onAdd={handleAddImages}
      />

      {/* Story player overlay */}
      {playing && playerSlides.length > 0 && (
        <StoryPlayer
          slides={playerSlides}
          initialIndex={activeIdx}
          onClose={() => setPlaying(false)}
        />
      )}
    </div>
  )
}

// ---------- Slide thumbnail ----------

function SlideThumb({
  slide, index, active, onSelect, onRemove,
}: {
  slide: DraftSlide
  index: number
  active: boolean
  onSelect: () => void
  onRemove: () => void
}) {
  return (
    <div
      className={cn(
        "group relative aspect-[9/16] w-full cursor-pointer overflow-hidden rounded-lg border-2 transition-all",
        active ? "border-primary shadow-sm shadow-primary/20" : "border-transparent hover:border-border"
      )}
      onClick={onSelect}
    >
      {slide.url ? (
        <Image
          src={slide.url}
          alt={slide.filename}
          fill
          placeholder="blur"
          blurDataURL={shimmerPlaceholder}
          className="object-cover"
          unoptimized
        />
      ) : (
        <div className="flex h-full items-center justify-center bg-muted">
          <ImageIcon className="size-4 text-muted-foreground/40" />
        </div>
      )}
      {/* Index badge */}
      <div className="absolute left-1 top-1 flex size-4 items-center justify-center rounded-full bg-black/60 text-[9px] font-bold text-white">
        {index + 1}
      </div>
      {/* Remove on hover */}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove() }}
        className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-destructive text-white opacity-0 transition-opacity group-hover:opacity-100"
      >
        <Trash2 className="size-2.5" />
      </button>
    </div>
  )
}

// ---------- Phone preview (static) ----------

function PhonePreview({
  slide, totalSlides, activeIdx,
}: {
  slide: DraftSlide | undefined
  totalSlides: number
  activeIdx: number
}) {
  return (
    <div
      className="relative overflow-hidden rounded-[36px] border-[5px] border-zinc-800 bg-zinc-950 shadow-xl"
      style={{ width: 270, height: 480 }}
    >
      {/* Notch */}
      <div className="absolute left-1/2 top-2.5 z-20 h-[14px] w-20 -translate-x-1/2 rounded-full bg-zinc-800" />

      {/* Image */}
      <div className="absolute inset-0">
        {slide?.url ? (
          <Image
            src={slide.url}
            alt={slide.filename}
            fill
            placeholder="blur"
            blurDataURL={shimmerPlaceholder}
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-zinc-900">
            <ImageIcon className="size-10 text-zinc-700" />
          </div>
        )}
      </div>

      {/* Gradient overlays */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-32 bg-gradient-to-b from-black/60 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-32 bg-gradient-to-t from-black/60 to-transparent" />

      {/* Progress bars */}
      {totalSlides > 0 && (
        <div className="absolute inset-x-3 top-8 z-20 flex gap-0.5">
          {Array.from({ length: totalSlides }).map((_, i) => (
            <div key={i} className="h-[2px] flex-1 overflow-hidden rounded-full bg-white/30">
              <div
                className="h-full rounded-full bg-white"
                style={{ width: i < activeIdx ? "100%" : i === activeIdx ? "40%" : "0%" }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <div className="absolute inset-x-3 top-[40px] z-20 flex items-center gap-1.5">
        <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60">
          <span className="text-[9px] font-bold text-white">V</span>
        </div>
        <span className="text-[11px] font-semibold text-white">vault</span>
      </div>

      {/* Caption */}
      {slide?.caption && (
        <div className="absolute inset-x-3 bottom-14 z-20 text-center">
          <p className="text-[12px] font-semibold text-white drop-shadow-lg leading-snug">{slide.caption}</p>
        </div>
      )}

      {/* Music badge */}
      <div className="absolute bottom-5 left-3 z-20">
        <div className="flex items-center gap-1 rounded-full bg-black/40 px-2 py-1">
          <Music className="size-2.5 text-white/60" />
          <span className="text-[9px] text-white/60">music</span>
        </div>
      </div>
    </div>
  )
}

// ---------- Slide config panel ----------

function SlideConfig({
  slide, index, total, onChange, onRemove,
}: {
  slide: DraftSlide
  index: number
  total: number
  onChange: (patch: Partial<DraftSlide>) => void
  onRemove: () => void
}) {
  const durationSec = Math.round(slide.duration_ms / 1000)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Slide {index + 1} of {total}
        </p>
      </div>

      {/* Duration */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Duration</label>
          <span className="tabular-nums text-sm text-muted-foreground">{durationSec}s</span>
        </div>
        <input
          type="range"
          min={1}
          max={15}
          step={1}
          value={durationSec}
          onChange={(e) => onChange({ duration_ms: Number(e.target.value) * 1000 })}
          className="w-full accent-primary"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>1s</span>
          <span>15s</span>
        </div>
      </div>

      {/* Transition */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Transition</label>
        <div className="flex gap-1.5">
          {TRANSITIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => onChange({ transition: value })}
              className={cn(
                "flex-1 rounded-lg border py-2 text-xs font-medium transition-all",
                slide.transition === value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-border/80 hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Caption */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Caption</label>
        <textarea
          value={slide.caption}
          onChange={(e) => onChange({ caption: e.target.value })}
          placeholder="Add a caption…"
          rows={3}
          className="w-full resize-none rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm outline-none placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
        />
      </div>

      {/* Image info */}
      {slide.url && (
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="relative aspect-video w-full bg-muted">
            <Image
              src={slide.url}
              alt={slide.filename}
              fill
              placeholder="blur"
              blurDataURL={shimmerPlaceholder}
              className="object-cover"
              unoptimized
            />
          </div>
          <div className="p-2.5">
            <p className="truncate text-xs font-medium">{slide.filename}</p>
            {slide.width && slide.height && (
              <p className="mt-0.5 text-[10px] text-muted-foreground tabular-nums">
                {slide.width} × {slide.height}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Spotify placeholder */}
      <div className="rounded-xl border border-dashed border-border p-4 text-center">
        <Music className="mx-auto size-5 text-muted-foreground/40" />
        <p className="mt-1.5 text-xs font-medium text-muted-foreground">Music</p>
        <p className="mt-0.5 text-[10px] text-muted-foreground/60">Spotify integration coming soon</p>
      </div>

      {/* Remove */}
      <button
        onClick={onRemove}
        className="mt-auto flex w-full items-center justify-center gap-1.5 rounded-lg border border-destructive/30 py-2 text-sm text-destructive/70 transition-colors hover:border-destructive hover:text-destructive"
      >
        <Trash2 className="size-3.5" />
        Remove slide
      </button>
    </div>
  )
}

// ---------- Image picker dialog ----------

const PICKER_LIMIT = 24

function StoryImagePicker({
  open, onOpenChange, onAdd,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (images: SlideImage[]) => void
}) {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const { data, isLoading } = useMedia(page, PICKER_LIMIT)

  const photos = data?.items.filter((img) => {
    if (img.status !== "ready" || !img.url) return false
    if (search.trim()) return img.filename.toLowerCase().includes(search.toLowerCase())
    return true
  }) ?? []

  const totalPages = data ? Math.ceil(data.total / PICKER_LIMIT) : 0

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleConfirm = () => {
    const selected = (data?.items ?? []).filter((img) => selectedIds.has(img.id))
    onAdd(selected.map((img) => ({
      id: img.id,
      url: img.url,
      filename: img.filename,
      width: img.width,
      height: img.height,
    })))
    setSelectedIds(new Set())
    onOpenChange(false)
  }

  const handleClose = (next: boolean) => {
    if (!next) { setSelectedIds(new Set()); setSearch("") }
    onOpenChange(next)
  }

  return (
    <PickerDialog
      open={open}
      onOpenChange={handleClose}
      title="Add photos to story"
      description="Tap photos to select them. Each becomes a slide."
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
          disabled={selectedIds.size === 0}
          className="gap-1.5"
        >
          <Images className="size-3.5" />
          {selectedIds.size > 0
            ? `Add ${selectedIds.size} ${selectedIds.size === 1 ? "slide" : "slides"}`
            : "Select photos"}
        </Button>
      }
    >
      {photos.length === 0 ? (
        <PickerEmpty text={search ? "No photos match your search." : "No photos yet."} />
      ) : (
        <div className="grid grid-cols-4 gap-2.5 pb-1">
          {photos.map((img) => {
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
                  placeholder="blur"
                  blurDataURL={shimmerPlaceholder}
                  className="object-cover"
                  unoptimized
                />
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

// ---------- Loading skeleton ----------

function BuilderSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex h-14 items-center gap-3 border-b border-border px-4">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-5 flex-1 max-w-xs" />
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="w-[88px] border-r border-border bg-muted/20 p-2 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="w-full rounded-lg" style={{ aspectRatio: "9/16" }} />
          ))}
        </div>
        <div className="flex flex-1 items-center justify-center">
          <Skeleton className="rounded-[36px]" style={{ width: 270, height: 480 }} />
        </div>
        <div className="w-72 border-l border-border p-5 space-y-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    </div>
  )
}
