"use client"

import { useState, useEffect, useRef, useCallback, useReducer } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Play, Plus, Trash2, ImageIcon, Music, Images, Pencil } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { PickerDialog, PickerEmpty } from "@/components/picker-dialog"
import { useStory, useUpdateStory } from "@/hooks/use-stories"
import { useMedia } from "@/hooks/use-media"
import { StoryPlayer } from "@/components/story-player"
import { SpotifyPickerDialog } from "@/components/spotify-picker-dialog"
import { VaultImage } from "@/components/vault-image"
import { displaySrc } from "@/lib/display-src"
import type { StorySlide, StoryTransition, SlideInput, SpotifyTrack } from "@/lib/api"

// ---------- Draft types ----------

type DraftSlide = {
    tempId: string
    id?: string
    image_id: string
    url?: string
    thumbnail_url?: string
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

type SlideImage = {
    id: string
    url?: string
    thumbnail_url?: string
    filename: string
    width?: number
    height?: number
}

function reducer(state: Draft, action: Action): Draft {
    switch (action.type) {
        case "LOAD":
            return action.draft
        case "SET_TITLE":
            return { ...state, title: action.title }
        case "SET_SPOTIFY":
            return { ...state, spotifyTrackId: action.trackId }
        case "ADD_SLIDES":
            return {
                ...state,
                slides: [
                    ...state.slides,
                    ...action.images.map((img) => ({
                        tempId: `tmp-${Date.now()}-${img.id}`,
                        image_id: img.id,
                        url: img.url,
                        thumbnail_url: img.thumbnail_url,
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
        default:
            return state
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

    const [draft, dispatch] = useReducer(reducer, { title: "", slides: [], spotifyTrackId: null })
    const [selectedTrack, setSelectedTrack] = useState<SpotifyTrack | null>(null)
    const [activeIdx, setActiveIdx] = useState(0)
    const [pickerOpen, setPickerOpen] = useState(false)
    const [musicOpen, setMusicOpen] = useState(false)
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
                    thumbnail_url: s.thumbnail_url,
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
                slides: d.slides.map(
                    (s) =>
                        ({
                            image_id: s.image_id,
                            duration_ms: s.duration_ms,
                            transition: s.transition,
                            caption: s.caption || undefined,
                        }) satisfies SlideInput
                ),
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
        thumbnail_url: s.thumbnail_url,
        filename: s.filename,
        width: s.width,
        height: s.height,
    }))

    if (isLoading) return <BuilderSkeleton />

    return (
        <div className="flex h-full flex-col overflow-hidden">
            {/* Top bar */}
            <div className="border-border flex h-14 shrink-0 items-center gap-3 border-b px-4">
                <button
                    onClick={() => router.back()}
                    className="text-muted-foreground hover:text-foreground flex shrink-0 items-center gap-1 text-sm transition-colors"
                >
                    <ArrowLeft className="size-3.5" />
                    Stories
                </button>
                <div className="bg-border mx-1 h-4 w-px" />

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
                        className="border-primary min-w-0 flex-1 border-b bg-transparent pb-px text-base font-semibold outline-none"
                    />
                ) : (
                    <button
                        onClick={() => {
                            setEditingTitle(true)
                            setTimeout(() => titleInputRef.current?.select(), 0)
                        }}
                        className="group flex min-w-0 flex-1 items-center gap-2 text-left"
                    >
                        <span className="truncate text-base font-semibold">
                            {draft.title || "Untitled Story"}
                        </span>
                        <Pencil className="text-muted-foreground/0 group-hover:text-muted-foreground/60 size-3.5 shrink-0 transition-colors" />
                    </button>
                )}

                <span
                    className={cn(
                        "shrink-0 text-xs transition-colors",
                        saveStatus === "saving" && "text-muted-foreground",
                        saveStatus === "saved" && "text-muted-foreground/40",
                        saveStatus === "unsaved" && "text-amber-500"
                    )}
                >
                    {saveStatus === "saving"
                        ? "Saving…"
                        : saveStatus === "saved"
                          ? "Saved"
                          : "Unsaved"}
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
            <div className="border-border flex shrink-0 border-b lg:hidden">
                <button
                    onClick={() => setMobileTab("slides")}
                    className={cn(
                        "flex-1 py-2.5 text-sm font-medium transition-colors",
                        mobileTab === "slides"
                            ? "border-primary text-primary border-b-2"
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
                            ? "border-primary text-primary border-b-2"
                            : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    Settings
                </button>
            </div>

            {/* Three-column layout — center panel hidden on mobile */}
            <div className="flex flex-1 overflow-hidden">
                {/* Left: slide strip */}
                <div
                    className={cn(
                        "border-border bg-muted/20 flex flex-1 flex-col overflow-y-auto border-r lg:flex-none lg:w-38",
                        mobileTab !== "slides" ? "hidden lg:flex" : ""
                    )}
                >
                    {/* Mobile: columns grid (matches all-photos layout) */}
                    <div className="columns-2 gap-3 p-2.5 pb-3 sm:columns-3 md:columns-4 lg:hidden">
                        {draft.slides.map((slide, i) => (
                            <div key={slide.tempId} className="mb-3 break-inside-avoid">
                                <SlideThumb
                                    slide={slide}
                                    index={i}
                                    active={i === activeIdx}
                                    onSelect={() => setActiveIdx(i)}
                                    onRemove={() => handleRemove(slide.tempId)}
                                />
                            </div>
                        ))}
                    </div>

                    {/* Mobile: normal add button */}
                    <div className="px-2.5 pb-4 lg:hidden">
                        <Button
                            variant="outline"
                            className="w-full gap-2"
                            onClick={() => setPickerOpen(true)}
                        >
                            <Plus className="size-4" />
                            Add slides
                        </Button>
                    </div>

                    {/* Desktop: vertical flex strip */}
                    <div className="hidden flex-1 flex-col gap-3 p-2.5 pb-4 lg:flex">
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
                            className="border-border text-muted-foreground hover:border-primary/50 hover:text-primary flex aspect-9/16 w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed transition-colors"
                        >
                            <Plus className="size-5" />
                            <span className="text-[11px] font-medium">Add slides</span>
                        </button>
                    </div>
                </div>

                {/* Center: large image view — desktop only */}
                <div className="relative hidden flex-1 items-center justify-center overflow-hidden bg-zinc-950 lg:flex">
                    <SlideView
                        slide={activeSlide}
                        totalSlides={draft.slides.length}
                        activeIdx={activeIdx}
                    />
                </div>

                {/* Right: slide config + story music */}
                <div
                    className={cn(
                        "border-border flex flex-col border-l",
                        "w-full lg:w-68 lg:shrink-0",
                        mobileTab !== "config" && "hidden lg:flex"
                    )}
                >
                    <div className="min-h-0 flex-1 overflow-y-auto p-5">
                        <div className="mx-auto max-w-md lg:max-w-none">
                            {activeSlide ? (
                                <SlideConfig
                                    slide={activeSlide}
                                    index={activeIdx}
                                    total={draft.slides.length}
                                    onChange={(patch) =>
                                        dispatch({
                                            type: "UPDATE_SLIDE",
                                            tempId: activeSlide.tempId,
                                            patch,
                                        })
                                    }
                                    onRemove={() => handleRemove(activeSlide.tempId)}
                                />
                            ) : (
                                <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                                    <ImageIcon className="text-muted-foreground/30 size-8" />
                                    <p className="text-muted-foreground text-sm">
                                        Select a slide to configure it
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Story music section — always visible */}
                    <div className="border-border shrink-0 border-t p-5">
                        <div className="mx-auto max-w-md lg:max-w-none">
                            <MusicSection
                                selectedTrack={selectedTrack}
                                onOpen={() => setMusicOpen(true)}
                                onRemove={handleRemoveTrack}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Image picker dialog */}
            <StoryImagePicker
                open={pickerOpen}
                onOpenChange={setPickerOpen}
                onAdd={handleAddImages}
                currentSlideCount={draft.slides.length}
            />

            {/* Music picker */}
            <SpotifyPickerDialog
                open={musicOpen}
                onOpenChange={setMusicOpen}
                selectedTrack={selectedTrack}
                onSelect={(track) => {
                    if (track) handleSelectTrack(track)
                    else handleRemoveTrack()
                }}
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

// ---------- Music section (story-level) ----------

function MusicSection({
    selectedTrack,
    onOpen,
    onRemove,
}: {
    selectedTrack: SpotifyTrack | null
    onOpen: () => void
    onRemove: () => void
}) {
    const fmt = (ms: number) => {
        const s = Math.floor(ms / 1000)
        return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <Music className="text-muted-foreground size-4" />
                <span className="text-sm font-medium">Music</span>
            </div>

            {selectedTrack ? (
                <div className="border-border bg-muted/30 rounded-xl border p-3">
                    <div className="flex items-center gap-3">
                        {selectedTrack.album_art_url && (
                            <img
                                src={selectedTrack.album_art_url}
                                alt=""
                                className="size-10 shrink-0 rounded-md object-cover"
                            />
                        )}
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-xs leading-none font-semibold">
                                {selectedTrack.name}
                            </p>
                            <p className="text-muted-foreground mt-0.5 truncate text-[10px]">
                                {selectedTrack.artists.join(", ")}
                            </p>
                            <p className="text-muted-foreground/50 mt-0.5 text-[10px] tabular-nums">
                                {fmt(selectedTrack.duration_ms)}
                            </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                            <button
                                onClick={onOpen}
                                className="text-primary text-[10px] hover:underline"
                            >
                                Change
                            </button>
                            <button
                                onClick={onRemove}
                                className="text-muted-foreground hover:text-destructive text-[10px]"
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <button
                    onClick={onOpen}
                    className="border-border text-muted-foreground hover:border-primary/40 hover:text-foreground flex w-full items-center gap-2.5 rounded-xl border border-dashed p-3 text-left transition-colors"
                >
                    <Music className="size-4 shrink-0" />
                    <div>
                        <p className="text-xs font-medium">Add music</p>
                        <p className="text-muted-foreground/60 text-[10px]">
                            Plays during story preview
                        </p>
                    </div>
                </button>
            )}
        </div>
    )
}

// ---------- Slide thumbnail ----------

function SlideThumb({
    slide,
    index,
    active,
    onSelect,
    onRemove,
}: {
    slide: DraftSlide
    index: number
    active: boolean
    onSelect: () => void
    onRemove: () => void
}) {
    const src = displaySrc(slide)
    const aspectStyle =
        slide.width && slide.height ? { aspectRatio: `${slide.width}/${slide.height}` } : undefined
    return (
        <div
            className={cn(
                "group relative w-full cursor-pointer overflow-hidden rounded-xl border-2 transition-all",
                !aspectStyle && "aspect-square",
                active
                    ? "border-primary shadow-primary/20 shadow-md"
                    : "hover:border-border border-transparent"
            )}
            style={aspectStyle}
            onClick={onSelect}
        >
            {src ? (
                <VaultImage src={src} alt={slide.filename} fill className="object-cover" />
            ) : (
                <div className="bg-muted flex h-full items-center justify-center">
                    <ImageIcon className="text-muted-foreground/40 size-5" />
                </div>
            )}
            <div className="absolute top-1.5 left-1.5 flex size-5 items-center justify-center rounded-full bg-black/60 text-[10px] font-bold text-white">
                {index + 1}
            </div>
            <button
                onClick={(e) => {
                    e.stopPropagation()
                    onRemove()
                }}
                className="bg-destructive absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
            >
                <Trash2 className="size-3" />
            </button>
            {active && <div className="bg-primary absolute inset-x-0 bottom-0 h-0.5" />}
        </div>
    )
}

// ---------- Center slide view ----------

function SlideView({
    slide,
    totalSlides,
    activeIdx,
}: {
    slide: DraftSlide | undefined
    totalSlides: number
    activeIdx: number
}) {
    if (!slide) {
        return (
            <div className="flex flex-col items-center justify-center gap-4 text-center">
                <ImageIcon className="size-12 text-zinc-700" />
                <p className="text-sm text-zinc-500">
                    Add slides from the left panel to get started
                </p>
            </div>
        )
    }

    const src = displaySrc(slide)
    return (
        <div className="relative flex h-full w-full items-center justify-center">
            {src && (
                <div
                    key={slide.tempId}
                    className="absolute inset-0 scale-110 overflow-hidden"
                    style={{ filter: "blur(32px) brightness(0.3) saturate(1.4)" }}
                >
                    <VaultImage src={src} alt="" fill className="object-cover" aria-hidden />
                </div>
            )}

            <div className="relative z-10 flex h-full max-h-full w-full items-center justify-center p-10">
                {src ? (
                    <div className="relative h-full w-full">
                        <VaultImage
                            key={slide.tempId}
                            src={src}
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
                    <p className="text-base font-semibold text-white drop-shadow-lg">
                        {slide.caption}
                    </p>
                </div>
            )}

            <div className="absolute bottom-5 left-1/2 z-20 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 backdrop-blur-sm">
                <span className="text-xs text-white/70 tabular-nums">
                    Slide {activeIdx + 1} of {totalSlides}
                </span>
            </div>
        </div>
    )
}

// ---------- Slide config panel ----------

function SlideConfig({
    slide,
    index,
    total,
    onChange,
    onRemove,
}: {
    slide: DraftSlide
    index: number
    total: number
    onChange: (patch: Partial<DraftSlide>) => void
    onRemove: () => void
}) {
    const durationSec = Math.round(slide.duration_ms / 1000)
    const slideSrc = displaySrc(slide)

    return (
        <div className="flex flex-col gap-5">
            <p className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
                Slide {index + 1} of {total}
            </p>

            {/* Duration */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Duration</label>
                    <span className="text-muted-foreground text-sm tabular-nums">
                        {durationSec}s
                    </span>
                </div>
                <input
                    type="range"
                    min={1}
                    max={15}
                    step={1}
                    value={durationSec}
                    onChange={(e) => onChange({ duration_ms: Number(e.target.value) * 1000 })}
                    className="accent-primary w-full"
                />
                <div className="text-muted-foreground flex justify-between text-[10px]">
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
                    className="border-border bg-muted/30 placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-primary/20 w-full resize-none rounded-lg border px-3 py-2 text-sm outline-none focus:ring-1"
                />
            </div>

            {/* Image info */}
            {(slide.url || slide.thumbnail_url) && (
                <div className="border-border overflow-hidden rounded-xl border">
                    <div className="bg-muted relative aspect-video w-full">
                        {slideSrc ? (
                            <VaultImage
                                src={slideSrc}
                                alt={slide.filename}
                                fill
                                className="object-cover"
                            />
                        ) : (
                            <div className="flex h-full items-center justify-center">
                                <ImageIcon className="text-muted-foreground/30 size-6" />
                            </div>
                        )}
                    </div>
                    <div className="p-2.5">
                        <p className="truncate text-xs font-medium">{slide.filename}</p>
                        {slide.width && slide.height && (
                            <p className="text-muted-foreground mt-0.5 text-[10px] tabular-nums">
                                {slide.width} × {slide.height}
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Remove */}
            <button
                onClick={onRemove}
                className="border-destructive/30 text-destructive/70 hover:border-destructive hover:text-destructive mt-auto flex w-full items-center justify-center gap-1.5 rounded-lg border py-2 text-sm transition-colors"
            >
                <Trash2 className="size-3.5" />
                Remove slide
            </button>
        </div>
    )
}

// ---------- Image picker dialog ----------

const PICKER_LIMIT = 18
const MAX_SLIDES = 8

function StoryImagePicker({
    open,
    onOpenChange,
    onAdd,
    currentSlideCount,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    onAdd: (images: SlideImage[]) => void
    currentSlideCount: number
}) {
    const [page, setPage] = useState(1)
    const [search, setSearch] = useState("")
    const [selectedOrder, setSelectedOrder] = useState<string[]>([])
    const { data, isLoading } = useMedia(page, PICKER_LIMIT)

    const remaining = MAX_SLIDES - currentSlideCount

    const photos = (data?.items ?? []).filter((img) => {
        if (img.status !== "ready" || !img.url) return false
        if (search.trim()) return img.filename.toLowerCase().includes(search.toLowerCase())
        return true
    })

    const totalPages = data ? Math.ceil(data.total / PICKER_LIMIT) : 0

    const toggle = (id: string) => {
        setSelectedOrder((prev) => {
            if (prev.includes(id)) return prev.filter((x) => x !== id)
            if (prev.length >= remaining) return prev
            return [...prev, id]
        })
    }

    const handleConfirm = () => {
        const itemMap = new Map((data?.items ?? []).map((img) => [img.id, img]))
        const selected = selectedOrder
            .map((id) => itemMap.get(id))
            .filter((img): img is NonNullable<typeof img> => img != null)
        onAdd(
            selected.map((img) => ({
                id: img.id,
                url: img.url,
                thumbnail_url: img.thumbnail_url,
                filename: img.filename,
                width: img.width,
                height: img.height,
            }))
        )
        setSelectedOrder([])
        onOpenChange(false)
    }

    const handleClose = (next: boolean) => {
        if (!next) {
            setSelectedOrder([])
            setSearch("")
        }
        onOpenChange(next)
    }

    return (
        <PickerDialog
            open={open}
            onOpenChange={handleClose}
            title="Add photos to story"
            description={
                remaining <= 0
                    ? `Story is full (${MAX_SLIDES} slides max).`
                    : `Select up to ${remaining} more photo${remaining === 1 ? "" : "s"} — each becomes a slide.`
            }
            searchPlaceholder="Filter by filename…"
            isLoading={isLoading}
            search={search}
            onSearchChange={(q) => {
                setSearch(q)
                setPage(1)
            }}
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            footer={
                <Button
                    size="sm"
                    onClick={handleConfirm}
                    disabled={selectedOrder.length === 0}
                    className="gap-1.5"
                >
                    <Images className="size-3.5" />
                    {selectedOrder.length > 0
                        ? `Add ${selectedOrder.length} ${selectedOrder.length === 1 ? "slide" : "slides"}`
                        : "Select photos"}
                </Button>
            }
        >
            {remaining <= 0 ? (
                <PickerEmpty
                    text={`You've reached the ${MAX_SLIDES}-slide limit. Remove a slide to add more.`}
                />
            ) : photos.length === 0 ? (
                <PickerEmpty text={search ? "No photos match your search." : "No photos yet."} />
            ) : (
                <div className="grid grid-cols-3 gap-3 pb-1">
                    {photos.map((img) => {
                        const orderPos = selectedOrder.indexOf(img.id)
                        const selected = orderPos !== -1
                        const atLimit = !selected && selectedOrder.length >= remaining
                        const src = displaySrc(img)
                        return (
                            <button
                                key={img.id}
                                onClick={() => toggle(img.id)}
                                disabled={atLimit}
                                className={cn(
                                    "group bg-muted relative aspect-square overflow-hidden rounded-xl transition-all duration-150",
                                    selected
                                        ? "ring-primary ring-[3px] ring-inset"
                                        : atLimit
                                          ? "cursor-not-allowed opacity-40"
                                          : "hover:opacity-90"
                                )}
                            >
                                {src ? (
                                    <VaultImage
                                        src={src}
                                        alt={img.filename}
                                        fill
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="flex h-full items-center justify-center">
                                        <ImageIcon className="text-muted-foreground/30 size-6" />
                                    </div>
                                )}
                                {selected ? (
                                    <div className="bg-primary/25 absolute inset-0 flex items-center justify-center">
                                        <div className="bg-primary flex size-7 items-center justify-center rounded-full shadow-md">
                                            <span className="text-primary-foreground text-xs font-bold">
                                                {orderPos + 1}
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="absolute top-2 right-2 size-5 rounded-full border-2 border-white/70 bg-black/20 opacity-0 transition-opacity group-hover:opacity-100" />
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
            <div className="border-border flex h-14 items-center gap-3 border-b px-4">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-5 w-48" />
            </div>
            <div className="flex flex-1 overflow-hidden">
                <div className="border-border bg-muted/20 w-38 space-y-2 border-r p-2.5">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton
                            key={i}
                            className="aspect-[9/16] w-full rounded-xl"
                        />
                    ))}
                </div>
                <div className="flex-1 bg-zinc-950" />
                <div className="border-border w-68 space-y-4 border-l p-5">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-20 w-full" />
                </div>
            </div>
        </div>
    )
}
