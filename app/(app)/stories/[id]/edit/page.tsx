"use client"

import { useState, useEffect, useRef, useCallback, useReducer } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft, Play, Plus, Trash2, ImageIcon, Music,
  Check, Images, Pencil, Search, X, Pause,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { PickerDialog, PickerEmpty } from "@/components/picker-dialog"
import { useStory, useUpdateStory } from "@/hooks/use-stories"
import { useMedia } from "@/hooks/use-media"
import { StoryPlayer } from "@/components/story-player"
import { VaultImage } from "@/components/vault-image"
import type { StorySlide, StoryTransition, SlideInput, SpotifyTrack } from "@/lib/api"

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

type Draft = { title: string; slides: DraftSlide[]; spotifyTrackId: string | null }

type Action =
  | { type: "LOAD"; draft: Draft }
  | { type: "SET_TITLE"; title: string }
  | { type: "SET_SPOTIFY"; trackId: string | null }
  | { type: "ADD_SLIDES"; images: SlideImage[] }
  | { type: "REMOVE_SLIDE"; tempId: string }
  | { type: "UPDATE_SLIDE"; tempId: string; patch: Partial<DraftSlide> }
  | { type: "MOVE_SLIDE"; from: number; to: number }

type SlideImage = { id: string; url?: string; filename: string; width?: number; height?: number }

function reducer(state: Draft, action: Action): Draft {
  switch (action.type) {
    case "LOAD": return action.draft
    case "SET_TITLE": return { ...state, title: action.title }
    case "SET_SPOTIFY": return { ...state, spotifyTrackId: action.trackId }
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
  const { data: story, isLoading } = useStory(id)
  const updateStory = useUpdateStory()

  const [draft, dispatch] = useReducer(reducer, { title: "", slides: [], spotifyTrackId: null })
  const [selectedTrack, setSelectedTrack] = useState<SpotifyTrack | null>(null)
  const [activeIdx, setActiveIdx] = useState(0)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved")
  const [editingTitle, setEditingTitle] = useState(false)
  const [mobileTab, setMobileTab] = useState<"slides" | "config">("slides")
  const titleInputRef = useRef<HTMLInputElement>(null)

  // Load story data into draft on first fetch
  const loaded = useRef(false)
  useEffect(() => {
    if (!story || loaded.current) return
    loaded.current = true
    dispatch({
      type: "LOAD",
      draft: {
        title: story.title,
        spotifyTrackId: story.spotify_track_id ?? null,
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
    setSelectedTrack(story.track ?? null)
  }, [story])

  // Auto-save — debounced 800ms after any draft change.
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const draftRef = useRef(draft)
  draftRef.current = draft
  const updateStoryRef = useRef(updateStory)
  updateStoryRef.current = updateStory

  const save = useCallback(() => {
    setSaveStatus("saving")
    const d = draftRef.current
    updateStoryRef.current.mutate(
      {
        id,
        title: d.title,
        spotify_track_id: d.spotifyTrackId,
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
  }, [id])

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

  const handleRemove = (tempId: string) => {
    dispatch({ type: "REMOVE_SLIDE", tempId })
    setActiveIdx((prev) => Math.min(prev, Math.max(0, draft.slides.length - 2)))
  }

  const handleSelectTrack = (track: SpotifyTrack) => {
    setSelectedTrack(track)
    dispatch({ type: "SET_SPOTIFY", trackId: track.id })
  }

  const handleRemoveTrack = () => {
    setSelectedTrack(null)
    dispatch({ type: "SET_SPOTIFY", trackId: null })
  }

  // Map draft → StorySlide for the player
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
          className="flex shrink-0 items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Stories
        </Link>
        <div className="mx-1 h-4 w-px bg-border" />

        {/* Editable title */}
        {editingTitle ? (
          <input
            ref={titleInputRef}
            autoFocus
            value={draft.title}
            onChange={(e) => dispatch({ type: "SET_TITLE", title: e.target.value })}
            onBlur={() => setEditingTitle(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === "Escape") setEditingTitle(false)
            }}
            className="min-w-0 flex-1 bg-transparent text-base font-semibold outline-none border-b border-primary pb-px"
          />
        ) : (
          <button
            onClick={() => { setEditingTitle(true); setTimeout(() => titleInputRef.current?.select(), 0) }}
            className="group flex min-w-0 flex-1 items-center gap-2 text-left"
          >
            <span className="truncate text-base font-semibold">{draft.title || "Untitled Story"}</span>
            <Pencil className="size-3.5 shrink-0 text-muted-foreground/0 transition-colors group-hover:text-muted-foreground/60" />
          </button>
        )}

        <span className={cn(
          "shrink-0 text-xs transition-colors",
          saveStatus === "saving" && "text-muted-foreground",
          saveStatus === "saved" && "text-muted-foreground/40",
          saveStatus === "unsaved" && "text-amber-500",
        )}>
          {saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved" : "Unsaved"}
        </span>
        <Button
          size="sm"
          className="shrink-0 gap-2"
          onClick={() => setPlaying(true)}
          disabled={draft.slides.length === 0}
        >
          <Play className="size-3.5 fill-current" />
          Preview
        </Button>
      </div>

      {/* Mobile tab bar — hidden on desktop */}
      <div className="flex shrink-0 border-b border-border lg:hidden">
        <button
          onClick={() => setMobileTab("slides")}
          className={cn(
            "flex-1 py-2.5 text-sm font-medium transition-colors",
            mobileTab === "slides"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Slides
        </button>
        <button
          onClick={() => setMobileTab("config")}
          className={cn(
            "flex-1 py-2.5 text-sm font-medium transition-colors",
            mobileTab === "config"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Settings
        </button>
      </div>

      {/* Three-column layout — center panel hidden on mobile */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: slide strip */}
        <div className={cn(
          "flex flex-col gap-2 overflow-y-auto border-r border-border bg-muted/20 p-2.5",
          "w-full lg:w-[152px] lg:shrink-0",
          mobileTab !== "slides" && "hidden lg:flex"
        )}>
          {draft.slides.map((slide, i) => (
            <SlideThumb
              key={slide.tempId}
              slide={slide}
              index={i}
              active={i === activeIdx}
              onSelect={() => setActiveIdx(i)}
              onRemove={() => handleRemove(slide.tempId)}
            />
          ))}
          <button
            onClick={() => setPickerOpen(true)}
            className="flex aspect-[9/16] w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
          >
            <Plus className="size-5" />
            <span className="text-[11px] font-medium">Add slides</span>
          </button>
        </div>

        {/* Center: large image view — desktop only */}
        <div className="relative hidden flex-1 items-center justify-center overflow-hidden bg-zinc-950 lg:flex">
          <SlideView slide={activeSlide} totalSlides={draft.slides.length} activeIdx={activeIdx} />
        </div>

        {/* Right: slide config + story music */}
        <div className={cn(
          "flex flex-col overflow-y-auto border-l border-border",
          "w-full lg:w-[272px] lg:shrink-0",
          mobileTab !== "config" && "hidden lg:flex"
        )}>
          <div className="flex-1 p-5">
            {activeSlide ? (
              <SlideConfig
                slide={activeSlide}
                index={activeIdx}
                total={draft.slides.length}
                onChange={(patch) => dispatch({ type: "UPDATE_SLIDE", tempId: activeSlide.tempId, patch })}
                onRemove={() => handleRemove(activeSlide.tempId)}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <ImageIcon className="size-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Select a slide to configure it</p>
              </div>
            )}
          </div>

          {/* Story music section — always visible */}
          <div className="border-t border-border p-5">
            <SpotifySection
              selectedTrack={selectedTrack}
              onSelect={handleSelectTrack}
              onRemove={handleRemoveTrack}
            />
          </div>
        </div>
      </div>

      {/* Image picker dialog */}
      <StoryImagePicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onAdd={handleAddImages}
      />

      {/* Story player overlay — only shown when Preview is clicked */}
      {playing && playerSlides.length > 0 && (
        <StoryPlayer
          slides={playerSlides}
          initialIndex={activeIdx}
          onClose={() => setPlaying(false)}
          track={selectedTrack ?? undefined}
        />
      )}
    </div>
  )
}

// ---------- Spotify section ----------

function SpotifySection({
  selectedTrack,
  onSelect,
  onRemove,
}: {
  selectedTrack: SpotifyTrack | null
  onSelect: (track: SpotifyTrack) => void
  onRemove: () => void
}) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SpotifyTrack[]>([])
  const [searching, setSearching] = useState(false)
  const [previewPlaying, setPreviewPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Debounced search
  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    setSearching(true)
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/spotify/search?q=${encodeURIComponent(query.trim())}`)
        if (res.ok) {
          const data = await res.json()
          setResults(data.tracks ?? [])
        }
      } finally {
        setSearching(false)
      }
    }, 400)
    return () => { clearTimeout(t); setSearching(false) }
  }, [query])

  const handleSelect = (track: SpotifyTrack) => {
    onSelect(track)
    setQuery("")
    setResults([])
    stopPreview()
  }

  const stopPreview = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    setPreviewPlaying(false)
  }

  const togglePreview = () => {
    if (!audioRef.current || !selectedTrack?.preview_url) return
    if (previewPlaying) {
      audioRef.current.pause()
      setPreviewPlaying(false)
    } else {
      audioRef.current.play().catch(() => {})
      setPreviewPlaying(true)
    }
  }

  const handleRemove = () => {
    stopPreview()
    onRemove()
  }

  const formatDuration = (ms: number) => {
    const s = Math.floor(ms / 1000)
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Music className="size-4 text-muted-foreground" />
        <span className="text-sm font-medium">Music</span>
      </div>

      {selectedTrack ? (
        <div className="rounded-xl border border-border bg-muted/30 p-3">
          <div className="flex items-center gap-3">
            {selectedTrack.album_art_url && (
              <div className="relative size-10 shrink-0 overflow-hidden rounded-md">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedTrack.album_art_url}
                  alt={selectedTrack.album_name}
                  className="h-full w-full object-cover"
                />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold leading-none">{selectedTrack.name}</p>
              <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                {selectedTrack.artists.join(", ")}
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground/60 tabular-nums">
                {formatDuration(selectedTrack.duration_ms)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {selectedTrack.preview_url && (
                <>
                  {selectedTrack.preview_url && (
                    <audio
                      ref={audioRef}
                      src={selectedTrack.preview_url}
                      preload="auto"
                      onEnded={() => setPreviewPlaying(false)}
                    />
                  )}
                  <button
                    onClick={togglePreview}
                    className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                    title={previewPlaying ? "Pause preview" : "Play 30s preview"}
                  >
                    {previewPlaying ? <Pause className="size-3 fill-primary" /> : <Play className="size-3 fill-primary" />}
                  </button>
                </>
              )}
              <button
                onClick={handleRemove}
                className="flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
            {searching ? (
              <div className="size-3.5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
            ) : (
              <Search className="size-3.5 text-muted-foreground/50" />
            )}
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Spotify…"
            className="w-full rounded-lg border border-border bg-muted/30 py-2 pl-9 pr-3 text-xs outline-none placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
          />
        </div>
      )}

      {/* Search results dropdown */}
      {results.length > 0 && !selectedTrack && (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-lg">
          {results.slice(0, 6).map((track) => (
            <button
              key={track.id}
              onClick={() => handleSelect(track)}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/60 first:rounded-t-xl last:rounded-b-xl"
            >
              {track.album_art_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={track.album_art_url}
                  alt=""
                  className="size-8 shrink-0 rounded-md object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium leading-none">{track.name}</p>
                <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                  {track.artists.join(", ")} · {track.album_name}
                </p>
              </div>
              <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground/60">
                {Math.floor(track.duration_ms / 60000)}:{String(Math.floor((track.duration_ms % 60000) / 1000)).padStart(2, "0")}
              </span>
            </button>
          ))}
        </div>
      )}

      {!selectedTrack && !query && (
        <p className="text-[10px] text-muted-foreground/50">
          Add a track that plays during preview.
        </p>
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
        "group relative aspect-[9/16] w-full cursor-pointer overflow-hidden rounded-xl border-2 transition-all",
        active
          ? "border-primary shadow-md shadow-primary/20"
          : "border-transparent hover:border-border"
      )}
      onClick={onSelect}
    >
      {slide.url ? (
        <VaultImage
          src={slide.url}
          alt={slide.filename}
          fill
          className="object-cover"
        />
      ) : (
        <div className="flex h-full items-center justify-center bg-muted">
          <ImageIcon className="size-5 text-muted-foreground/40" />
        </div>
      )}
      <div className="absolute left-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-black/60 text-[10px] font-bold text-white">
        {index + 1}
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onRemove() }}
        className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-destructive text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
      >
        <Trash2 className="size-3" />
      </button>
      {active && (
        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-primary" />
      )}
    </div>
  )
}

// ---------- Center slide view ----------

function SlideView({
  slide, totalSlides, activeIdx,
}: {
  slide: DraftSlide | undefined
  totalSlides: number
  activeIdx: number
}) {
  if (!slide) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 text-center">
        <ImageIcon className="size-12 text-zinc-700" />
        <p className="text-sm text-zinc-500">Add slides from the left panel to get started</p>
      </div>
    )
  }

  return (
    <div className="relative flex h-full w-full items-center justify-center">
      {slide.url && (
        <div
          key={slide.tempId}
          className="absolute inset-0 scale-110 overflow-hidden"
          style={{ filter: "blur(32px) brightness(0.3) saturate(1.4)" }}
        >
          <VaultImage src={slide.url} alt="" fill className="object-cover" aria-hidden />
        </div>
      )}

      <div className="relative z-10 flex h-full max-h-full w-full items-center justify-center p-10">
        {slide.url ? (
          <div className="relative h-full w-full">
            <VaultImage
              key={slide.tempId}
              src={slide.url}
              alt={slide.filename}
              fill
              className="object-contain drop-shadow-2xl"
            />
          </div>
        ) : (
          <div className="flex h-64 w-64 items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-900">
            <ImageIcon className="size-12 text-zinc-600" />
          </div>
        )}
      </div>

      {slide.caption && (
        <div className="absolute inset-x-8 bottom-16 z-20 text-center">
          <p className="text-base font-semibold text-white drop-shadow-lg">{slide.caption}</p>
        </div>
      )}

      <div className="absolute bottom-5 left-1/2 z-20 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 backdrop-blur-sm">
        <span className="text-xs tabular-nums text-white/70">
          Slide {activeIdx + 1} of {totalSlides}
        </span>
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
    <div className="flex flex-col gap-5">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        Slide {index + 1} of {total}
      </p>

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
                  : "border-border text-muted-foreground hover:text-foreground"
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
            <VaultImage
              src={slide.url}
              alt={slide.filename}
              fill
              className="object-cover"
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

const PICKER_LIMIT = 18

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

  const photos = (data?.items ?? []).filter((img) => {
    if (img.status !== "ready" || !img.url) return false
    if (search.trim()) return img.filename.toLowerCase().includes(search.toLowerCase())
    return true
  })

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
      description="Select photos — each becomes a slide in sequence."
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
        <div className="grid grid-cols-3 gap-3 pb-1">
          {photos.map((img) => {
            const selected = selectedIds.has(img.id)
            return (
              <button
                key={img.id}
                onClick={() => toggle(img.id)}
                className={cn(
                  "group relative aspect-square overflow-hidden rounded-xl bg-muted transition-all duration-150",
                  selected
                    ? "ring-[3px] ring-inset ring-primary"
                    : "hover:opacity-90"
                )}
              >
                <VaultImage
                  src={img.url!}
                  alt={img.filename}
                  fill
                  className="object-cover"
                />
                <div className={cn(
                  "absolute inset-0 flex items-center justify-center transition-opacity duration-150",
                  selected ? "bg-primary/25 opacity-100" : "opacity-0"
                )}>
                  <div className="flex size-7 items-center justify-center rounded-full bg-primary shadow-md">
                    <Check className="size-4 text-primary-foreground" />
                  </div>
                </div>
                {!selected && (
                  <div className="absolute right-2 top-2 size-5 rounded-full border-2 border-white/70 bg-black/20 opacity-0 transition-opacity group-hover:opacity-100" />
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
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-5 w-48" />
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="w-[152px] border-r border-border bg-muted/20 p-2.5 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="w-full rounded-xl" style={{ aspectRatio: "9/16" }} />
          ))}
        </div>
        <div className="flex-1 bg-zinc-950" />
        <div className="w-[272px] border-l border-border p-5 space-y-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    </div>
  )
}
