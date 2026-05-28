// Module-level cache that maps imageId → stable presigned URLs.
//
// Presigned URLs expire after 1 hour on the backend, but each React Query fetch
// generates NEW signatures. Without this cache, the same image appearing in gallery,
// all-photos, favourites, and albums would each have a unique URL — defeating
// browser caching entirely. We lock in the first seen URL per image and only
// swap it out when a fresher one arrives or the current one is about to expire.
const _cache = new Map<string, { url: string; thumbnail_url?: string; exp: number }>()

const SAFETY_MS = 2 * 60_000 // drop URL 2 min before it actually expires

function parsePresignedExpiry(url: string | undefined): number {
    if (!url) return 0
    try {
        const u = new URL(url)
        const dateStr = u.searchParams.get("X-Amz-Date") // e.g. "20240101T120000Z"
        const expiresStr = u.searchParams.get("X-Amz-Expires") // e.g. "3600"
        if (!dateStr || !expiresStr) return Date.now() + 55 * 60_000
        const iso = dateStr.replace(
            /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/,
            "$1-$2-$3T$4:$5:$6Z"
        )
        return new Date(iso).getTime() + parseInt(expiresStr, 10) * 1000
    } catch {
        return Date.now() + 55 * 60_000
    }
}

export function normalizeImage<T extends { id: string; url?: string; thumbnail_url?: string }>(
    img: T
): T {
    if (!img.url) return img
    const now = Date.now()
    const cached = _cache.get(img.id)
    const incomingExp = parsePresignedExpiry(img.url)

    // Use the cached URL if it still has meaningful time left AND the incoming
    // URL isn't significantly fresher (which would indicate a background refetch).
    if (cached && cached.exp > now + SAFETY_MS) {
        if (incomingExp > cached.exp + 5 * 60_000) {
            // Incoming URL is at least 5 min fresher — update the cache.
            _cache.set(img.id, { url: img.url, thumbnail_url: img.thumbnail_url, exp: incomingExp })
            return img
        }
        return { ...img, url: cached.url, thumbnail_url: cached.thumbnail_url }
    }

    // Cache is absent or nearly expired — latch onto the incoming URL.
    _cache.set(img.id, { url: img.url, thumbnail_url: img.thumbnail_url, exp: incomingExp })
    return img
}

export function evictImage(id: string) {
    _cache.delete(id)
}
