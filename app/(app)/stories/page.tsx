"use client"

import { useRef, useEffect } from "react"
import Link from "next/link"
import { Clapperboard, Plus, Trash2, Play } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useStories, useCreateStory, useDeleteStory } from "@/hooks/use-stories"
import { VaultImage } from "@/components/vault-image"
import type { Story } from "@/lib/api"
import gsap from "@/lib/gsap"
import { useRouter } from "next/navigation"

export default function StoriesPage() {
  const { data: stories, isLoading } = useStories()
  const createStory = useCreateStory()
  const router = useRouter()

  const gridRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (isLoading || !gridRef.current) return
    const cards = gridRef.current.querySelectorAll<HTMLElement>("[data-card]")
    gsap.fromTo(cards,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.4, stagger: 0.06, ease: "power2.out" }
    )
  }, [isLoading])

  const handleNew = () => {
    createStory.mutate("Untitled Story", {
      onSuccess: (story) => router.push(`/stories/${story.id}/edit`),
    })
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Stories</h1>
          {stories && (
            <p className="mt-1 text-sm text-muted-foreground">
              {stories.length} {stories.length === 1 ? "story" : "stories"}
            </p>
          )}
        </div>
        <Button size="sm" className="gap-2" onClick={handleNew} disabled={createStory.isPending}>
          <Plus className="size-4" />
          New story
        </Button>
      </div>

      {isLoading && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => <StorySkeleton key={i} />)}
        </div>
      )}

      {!isLoading && stories?.length === 0 && (
        <div className="flex flex-col items-center justify-center py-28 text-center">
          <div className="mb-5 rounded-2xl border border-border bg-card p-7">
            <Clapperboard className="size-10 text-muted-foreground/40" />
          </div>
          <h2 className="text-lg font-semibold">No stories yet</h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Create your first story — pick images, set timings, and build an Instagram-style reel.
          </p>
          <Button className="mt-5 gap-2" onClick={handleNew} disabled={createStory.isPending}>
            <Plus className="size-4" />
            Create your first story
          </Button>
        </div>
      )}

      {!isLoading && stories && stories.length > 0 && (
        <div ref={gridRef} className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {stories.map((story) => (
            <StoryCard key={story.id} story={story} />
          ))}
        </div>
      )}
    </div>
  )
}

function StoryCard({ story }: { story: Story }) {
  const deleteStory = useDeleteStory()

  return (
    <div
      data-card
      className="group relative flex flex-col min-w-0 overflow-hidden rounded-xl border border-border bg-card hover:shadow-md transition-shadow"
    >
      {/* Cover — 9:16 aspect ratio */}
      <Link href={`/stories/${story.id}/edit`} className="block">
        <div className="relative aspect-[9/16] overflow-hidden bg-muted">
          {story.cover_url ? (
            <VaultImage
              src={story.cover_url}
              alt={story.title}
              fill
              className="object-cover sm:transition-[opacity,scale] sm:duration-300 sm:group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Clapperboard className="size-8 text-muted-foreground/25" />
            </div>
          )}

          {/* Slide count badge */}
          <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 backdrop-blur-sm">
            <Play className="size-2.5 fill-white text-white" />
            <span className="text-[10px] font-medium text-white tabular-nums">{story.slide_count}</span>
          </div>
        </div>

        <div className="p-3">
          <p className="truncate text-sm font-medium">{story.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {story.slide_count} {story.slide_count === 1 ? "slide" : "slides"}
          </p>
        </div>
      </Link>

      {/* Delete — always visible on mobile, hover-only on desktop */}
      <div className="absolute right-2 top-2 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button
                variant="destructive"
                size="icon"
                className="size-8 shadow-md"
                disabled={deleteStory.isPending}
              />
            }
          >
            <Trash2 className="size-3.5" />
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete story?</AlertDialogTitle>
              <AlertDialogDescription>
                <span className="font-medium">{story.title}</span> will be permanently deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteStory.mutate(story.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}

function StorySkeleton() {
  return (
    <div className={cn("overflow-hidden rounded-xl border border-border bg-card")}>
      <Skeleton className="w-full rounded-none" style={{ aspectRatio: "9/16" }} />
      <div className="space-y-1.5 p-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  )
}
