"use client"

import { useState, useEffect, useRef } from "react"
import { Play, Pause, Check, VolumeX } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { PickerDialog, PickerEmpty } from "@/components/picker-dialog"
import type { SpotifyTrack } from "@/lib/api"

interface SpotifyPickerDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    selectedTrack: SpotifyTrack | null
    onSelect: (track: SpotifyTrack | null) => void
}

export function SpotifyPickerDialog({
    open,
    onOpenChange,
    selectedTrack,
    onSelect,
}: SpotifyPickerDialogProps) {
    const [query, setQuery] = useState("")
    const [results, setResults] = useState<SpotifyTrack[]>([])
    const [searching, setSearching] = useState(false)
    const [pending, setPending] = useState<SpotifyTrack | null>(null)
    const [playingId, setPlayingId] = useState<string | null>(null)
    const audio = useRef<HTMLAudioElement | null>(null)

    // Initialise pending to currently selected track when dialog opens
    useEffect(() => {
        if (open) setPending(selectedTrack)
    }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

    // Stop audio + reset state when dialog closes
    useEffect(() => {
        if (!open) {
            audio.current?.pause()
            setPlayingId(null)
            setQuery("")
            setResults([])
        }
    }, [open])

    // Debounced search
    useEffect(() => {
        if (!query.trim()) {
            setResults([])
            return
        }
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
        return () => {
            clearTimeout(t)
            setSearching(false)
        }
    }, [query])

    const togglePreview = (track: SpotifyTrack) => {
        if (!track.preview_url) return
        if (!audio.current) {
            audio.current = new Audio()
            audio.current.onended = () => setPlayingId(null)
        }
        if (playingId === track.id) {
            audio.current.pause()
            setPlayingId(null)
        } else {
            audio.current.src = track.preview_url
            audio.current.play().catch(() => {})
            setPlayingId(track.id)
        }
    }

    const handleConfirm = () => {
        onSelect(pending)
        onOpenChange(false)
    }

    const fmt = (ms: number) => {
        const s = Math.floor(ms / 1000)
        return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`
    }

    const displayList =
        results.length > 0
            ? results
            : pending
              ? [pending] // show the already-selected track when search is empty
              : []

    return (
        <PickerDialog
            open={open}
            onOpenChange={onOpenChange}
            title="Add music"
            description="Search for a track to play during your story."
            searchPlaceholder="Search Spotify…"
            isLoading={searching && results.length === 0}
            search={query}
            onSearchChange={setQuery}
            footer={
                <div className="ml-auto flex items-center gap-2">
                    {pending && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground"
                            onClick={() => {
                                setPending(null)
                            }}
                        >
                            Remove
                        </Button>
                    )}
                    <Button size="sm" onClick={handleConfirm}>
                        {pending ? "Confirm" : "No music"}
                    </Button>
                </div>
            }
        >
            {displayList.length === 0 ? (
                <PickerEmpty text="Search for a song, artist, or album." />
            ) : (
                <div className="space-y-0.5 pb-1">
                    {displayList.map((track) => {
                        const isSelected = pending?.id === track.id
                        const isPlaying = playingId === track.id
                        const hasPreview = !!track.preview_url

                        return (
                            <div
                                key={track.id}
                                className={cn(
                                    "group flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition-colors",
                                    isSelected
                                        ? "bg-primary/10 ring-primary/20 ring-1"
                                        : "hover:bg-muted/60"
                                )}
                                onClick={() => setPending(isSelected ? null : track)}
                            >
                                {/* Album art */}
                                <div className="bg-muted relative size-10 shrink-0 overflow-hidden rounded-lg">
                                    {track.album_art_url && (
                                        <img
                                            src={track.album_art_url}
                                            alt=""
                                            className="h-full w-full object-cover"
                                        />
                                    )}
                                </div>

                                {/* Info */}
                                <div className="min-w-0 flex-1">
                                    <p
                                        className={cn(
                                            "truncate text-sm leading-none font-medium",
                                            isSelected && "text-primary"
                                        )}
                                    >
                                        {track.name}
                                    </p>
                                    <p className="text-muted-foreground mt-0.5 truncate text-xs">
                                        {track.artists.join(", ")}
                                        {track.album_name && (
                                            <span className="text-muted-foreground/50">
                                                {" "}
                                                · {track.album_name}
                                            </span>
                                        )}
                                    </p>
                                </div>

                                {/* Duration */}
                                <span className="text-muted-foreground/50 shrink-0 text-[11px] tabular-nums">
                                    {fmt(track.duration_ms)}
                                </span>

                                {/* Preview button */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        togglePreview(track)
                                    }}
                                    disabled={!hasPreview}
                                    title={
                                        hasPreview
                                            ? isPlaying
                                                ? "Pause"
                                                : "Play 30s preview"
                                            : "No preview available"
                                    }
                                    className={cn(
                                        "flex size-7 shrink-0 items-center justify-center rounded-full transition-colors",
                                        hasPreview
                                            ? isPlaying
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
                                            : "cursor-not-allowed opacity-30"
                                    )}
                                >
                                    {!hasPreview ? (
                                        <VolumeX className="size-3" />
                                    ) : isPlaying ? (
                                        <Pause className="size-3 fill-current" />
                                    ) : (
                                        <Play className="size-3 fill-current" />
                                    )}
                                </button>

                                {/* Selection checkmark */}
                                <div
                                    className={cn(
                                        "flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-all",
                                        isSelected ? "border-primary bg-primary" : "border-border"
                                    )}
                                >
                                    {isSelected && (
                                        <Check className="text-primary-foreground size-3" />
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </PickerDialog>
    )
}
