"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
    ImageUp,
    CheckCircle2,
    XCircle,
    Loader2,
    X,
    ArrowLeft,
    Zap,
    Image as ImageIcon,
    FolderOpen,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"
import { useUpload, type UploadItem } from "@/hooks/use-upload"

const ACCEPTED = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/avif"]
const MAX_SIZE = 50 * 1024 * 1024

const FEATURES = [
    {
        icon: Zap,
        title: "Direct to storage",
        desc: "Files upload straight to MinIO via presigned URLs — no server bottleneck.",
    },
    {
        icon: ImageIcon,
        title: "Auto thumbnails",
        desc: "Optimised previews are generated in the background by the worker.",
    },
    {
        icon: FolderOpen,
        title: "Stay organised",
        desc: "Add any photo to albums or favourites once it finishes processing.",
    },
] as const

function formatBytes(n: number) {
    if (n < 1024) return `${n} B`
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
    return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

function filterFiles(files: File[]): { valid: File[]; rejected: string[] } {
    const valid: File[] = []
    const rejected: string[] = []
    for (const f of files) {
        if (!ACCEPTED.includes(f.type)) {
            rejected.push(`${f.name}: unsupported type`)
        } else if (f.size > MAX_SIZE) {
            rejected.push(`${f.name}: exceeds 50 MB`)
        } else {
            valid.push(f)
        }
    }
    return { valid, rejected }
}

export default function UploadPage() {
    const router = useRouter()
    const { items, addFiles, removeItem, clearCompleted } = useUpload()
    const [isDragging, setIsDragging] = useState(false)
    const [rejections, setRejections] = useState<string[]>([])
    const inputRef = useRef<HTMLInputElement>(null)

    const handleFiles = useCallback(
        (files: File[]) => {
            const { valid, rejected } = filterFiles(files)
            setRejections(rejected)
            if (valid.length) addFiles(valid)
        },
        [addFiles]
    )

    const onDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault()
            setIsDragging(false)
            handleFiles(Array.from(e.dataTransfer.files))
        },
        [handleFiles]
    )

    const onDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }
    const onDragLeave = (e: React.DragEvent) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false)
    }
    const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.length) handleFiles(Array.from(e.target.files))
        e.target.value = ""
    }

    const hasCompleted = items.some((i) => i.status === "ready" || i.status === "failed")
    const allDone =
        items.length > 0 && items.every((i) => i.status === "ready" || i.status === "failed")
    const isEmpty = items.length === 0

    return (
        <div className="relative min-h-full">
            {/* Decorative background blobs */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
                <div className="bg-primary/6 absolute -top-32 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full blur-3xl" />
                <div className="bg-primary/4 absolute right-0 bottom-0 h-64 w-64 rounded-full blur-3xl" />
                <div className="bg-accent/5 absolute top-1/2 left-0 h-48 w-48 -translate-y-1/2 rounded-full blur-3xl" />
            </div>

            <div className="relative mx-auto max-w-2xl px-4 py-8 sm:px-6">
                {/* Header */}
                <div className="mb-8 flex items-center gap-3">
                    <button
                        onClick={() => router.back()}
                        className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}
                        aria-label="Go back"
                    >
                        <ArrowLeft className="size-4" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">Upload images</h1>
                        <p className="text-muted-foreground mt-0.5 text-sm">
                            JPEG · PNG · GIF · WebP · AVIF &middot; up to 50 MB each
                        </p>
                    </div>
                </div>

                {/* Drop zone */}
                <div
                    role="button"
                    tabIndex={0}
                    onClick={() => inputRef.current?.click()}
                    onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    className={cn(
                        "flex cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-16 text-center transition-all duration-200",
                        isDragging
                            ? "border-primary bg-primary/8 scale-[1.01]"
                            : "border-border/60 bg-muted/20 hover:border-border hover:bg-muted/40"
                    )}
                >
                    <div
                        className={cn(
                            "rounded-2xl border p-5 transition-colors duration-200",
                            isDragging
                                ? "border-primary/40 bg-primary/10"
                                : "border-border/50 bg-background/80"
                        )}
                    >
                        <ImageUp
                            className={cn(
                                "size-10 transition-colors duration-200",
                                isDragging ? "text-primary" : "text-muted-foreground/60"
                            )}
                        />
                    </div>
                    <div>
                        <p className="text-base font-semibold">
                            {isDragging ? "Drop to upload" : "Drag & drop your images"}
                        </p>
                        <p className="text-muted-foreground mt-1 text-sm">
                            or{" "}
                            <span className="text-primary underline-offset-2 hover:underline">
                                browse files
                            </span>
                        </p>
                    </div>
                    <input
                        ref={inputRef}
                        type="file"
                        accept={ACCEPTED.join(",")}
                        multiple
                        className="sr-only"
                        onChange={onInputChange}
                    />
                </div>

                {/* Rejections */}
                {rejections.length > 0 && (
                    <div className="border-destructive/30 bg-destructive/5 mt-3 rounded-xl border px-4 py-3">
                        <p className="text-destructive text-sm font-medium">
                            Some files were skipped:
                        </p>
                        <ul className="mt-1 space-y-0.5">
                            {rejections.map((r, i) => (
                                <li key={i} className="text-destructive/80 text-xs">
                                    {r}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Feature cards — shown when queue is empty */}
                {isEmpty && (
                    <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
                        {FEATURES.map(({ icon: Icon, title, desc }) => (
                            <div
                                key={title}
                                className="border-border/50 bg-card/60 rounded-xl border p-4 backdrop-blur-sm"
                            >
                                <div className="border-border/50 bg-muted/60 mb-3 flex size-8 items-center justify-center rounded-lg border">
                                    <Icon className="text-muted-foreground size-4" />
                                </div>
                                <p className="text-sm leading-snug font-medium">{title}</p>
                                <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                                    {desc}
                                </p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Queue */}
                {items.length > 0 && (
                    <div className="mt-6 space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-muted-foreground text-sm font-medium">
                                {items.length} {items.length === 1 ? "file" : "files"}
                            </p>
                            {hasCompleted && (
                                <Button variant="ghost" size="sm" onClick={clearCompleted}>
                                    Clear completed
                                </Button>
                            )}
                        </div>

                        <div className="divide-border/50 border-border/50 bg-card divide-y rounded-xl border">
                            {items.map((item) => (
                                <UploadRow key={item.localId} item={item} onRemove={removeItem} />
                            ))}
                        </div>

                        {allDone && (
                            <div className="mt-4 flex justify-end">
                                <Link href="/dashboard" className={cn(buttonVariants(), "gap-2")}>
                                    View in dashboard
                                </Link>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

function UploadRow({ item, onRemove }: { item: UploadItem; onRemove: (id: string) => void }) {
    const { status, file, progress, error } = item
    const isActive = status === "uploading" || status === "processing"

    const previewUrl = useMemo(() => URL.createObjectURL(file), [file])
    useEffect(() => () => URL.revokeObjectURL(previewUrl), [previewUrl])

    return (
        <div className="flex items-center gap-3 px-4 py-3">
            <div className="bg-muted relative size-11 shrink-0 overflow-hidden rounded-lg">
                <img src={previewUrl} alt={file.name} className="h-full w-full object-cover" />
            </div>
            <StatusIcon status={status} progress={progress} />

            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium" title={file.name}>
                    {file.name}
                </p>
                <div className="mt-1 flex items-center gap-2">
                    <span className="text-muted-foreground text-xs">{formatBytes(file.size)}</span>
                    {status === "uploading" && (
                        <span className="text-muted-foreground text-xs">· {progress}%</span>
                    )}
                    {status === "processing" && (
                        <span className="text-xs text-amber-600 dark:text-amber-400">
                            · processing…
                        </span>
                    )}
                    {status === "ready" && (
                        <span className="text-xs text-emerald-600 dark:text-emerald-400">
                            · ready
                        </span>
                    )}
                    {status === "failed" && error && (
                        <span className="text-destructive text-xs">· {error}</span>
                    )}
                </div>
                {status === "uploading" && (
                    <div className="bg-muted mt-2 h-1 overflow-hidden rounded-full">
                        <div
                            className="bg-primary h-full rounded-full transition-all duration-150"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                )}
            </div>

            {!isActive && (
                <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onRemove(item.localId)}
                    className="text-muted-foreground hover:text-foreground shrink-0"
                >
                    <X className="size-3.5" />
                </Button>
            )}
        </div>
    )
}

function StatusIcon({ status, progress }: { status: UploadItem["status"]; progress: number }) {
    if (status === "ready") return <CheckCircle2 className="size-5 shrink-0 text-emerald-500" />
    if (status === "failed") return <XCircle className="text-destructive size-5 shrink-0" />
    if (status === "uploading") {
        return (
            <div className="relative size-5 shrink-0">
                <svg className="-rotate-90" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="8" className="stroke-muted" strokeWidth="2.5" />
                    <circle
                        cx="10"
                        cy="10"
                        r="8"
                        className="stroke-primary transition-all duration-150"
                        strokeWidth="2.5"
                        strokeDasharray={`${2 * Math.PI * 8}`}
                        strokeDashoffset={`${2 * Math.PI * 8 * (1 - progress / 100)}`}
                        strokeLinecap="round"
                    />
                </svg>
            </div>
        )
    }
    if (status === "processing")
        return <Loader2 className="size-5 shrink-0 animate-spin text-amber-500" />
    return <div className="border-border/60 size-5 shrink-0 rounded-full border-2" />
}
