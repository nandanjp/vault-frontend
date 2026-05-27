// Returns the safest display src for card/thumbnail contexts.
//
// The worker only skips thumbnail generation for images already ≤600px wide,
// so if thumbnail_url is absent the original is guaranteed to be small — safe
// to load. When width > 600 but no thumbnail exists (worker failure), we
// return null so callers can show a placeholder icon instead of fetching a
// potentially large original.
export function displaySrc(img: {
  url?: string
  thumbnail_url?: string
  width?: number
}): string | null {
  if (img.thumbnail_url) return img.thumbnail_url
  if (!img.url) return null
  if (!img.width || img.width <= 600) return img.url
  return null
}
