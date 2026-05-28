"use client"

import { useState } from "react"
import { Download, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export type FilterID =
    | "original"
    | "grayscale"
    | "sepia"
    | "vivid"
    | "cool"
    | "vintage"
    | "fade"
    | "punch"

export const FILTERS: { id: FilterID; label: string; css: string }[] = [
    { id: "original", label: "Original", css: "none" },
    { id: "grayscale", label: "B&W", css: "grayscale(100%)" },
    { id: "sepia", label: "Sepia", css: "sepia(80%)" },
    { id: "vivid", label: "Vivid", css: "saturate(160%) contrast(110%)" },
    { id: "cool", label: "Cool", css: "saturate(70%) hue-rotate(195deg) brightness(105%)" },
    { id: "vintage", label: "Vintage", css: "sepia(35%) contrast(95%) brightness(92%)" },
    { id: "fade", label: "Fade", css: "contrast(75%) brightness(115%) saturate(70%)" },
    { id: "punch", label: "Punch", css: "contrast(115%) saturate(140%)" },
]

interface FilterPanelProps {
    imageId: string
    filename: string
    onFilterChange: (css: string) => void
}

export function FilterPanel({ imageId, filename, onFilterChange }: FilterPanelProps) {
    const [selected, setSelected] = useState<FilterID>("original")
    const [downloading, setDownloading] = useState(false)

    const select = (f: (typeof FILTERS)[number]) => {
        setSelected(f.id)
        onFilterChange(f.css)
    }

    const downloadFiltered = async () => {
        setDownloading(true)
        try {
            const res = await fetch(`/api/images/${imageId}/transform?filter=${selected}`)
            if (!res.ok) throw new Error("Transform failed")
            const blob = await res.blob()
            const ext = filename.includes(".") ? "" : ".jpg"
            const base = filename.replace(/\.[^.]+$/, "")
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = `${selected}_${base}${ext}.jpg`
            a.click()
            URL.revokeObjectURL(url)
        } catch (err) {
            console.error("filter download failed:", err)
        } finally {
            setDownloading(false)
        }
    }

    return (
        <div className="border-border bg-card rounded-xl border p-5">
            <h2 className="text-muted-foreground mb-3 text-xs font-semibold tracking-wider uppercase">
                Filters
            </h2>

            <div className="flex flex-wrap gap-2">
                {FILTERS.map((f) => (
                    <button
                        key={f.id}
                        onClick={() => select(f)}
                        className={cn(
                            "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                            selected === f.id
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                        )}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {selected !== "original" && (
                <Button
                    size="sm"
                    variant="outline"
                    className="mt-4 w-full gap-2"
                    onClick={downloadFiltered}
                    disabled={downloading}
                >
                    {downloading ? (
                        <Loader2 className="size-4 animate-spin" />
                    ) : (
                        <Download className="size-4" />
                    )}
                    Download with filter
                </Button>
            )}
        </div>
    )
}
