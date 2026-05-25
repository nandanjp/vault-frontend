const AUTH_URL = process.env.AUTH_URL ?? "http://localhost:3002"
const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3001"

export type ApiError = { message: string; status: number }

async function request<T>(
  url: string,
  init: RequestInit = {},
  token?: string
): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...init.headers,
  }
  const res = await fetch(url, { ...init, headers })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw { message: body.error ?? res.statusText, status: res.status } satisfies ApiError
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

// --- Auth service ---

export type TokenPair = {
  access_token: string
  refresh_token: string
  expires_in: number
}

export const authApi = {
  register: (email: string, password: string) =>
    request<{ id: string; email: string }>(
      `${AUTH_URL}/register`,
      { method: "POST", body: JSON.stringify({ email, password }) }
    ),

  login: (email: string, password: string) =>
    request<TokenPair>(
      `${AUTH_URL}/login`,
      { method: "POST", body: JSON.stringify({ email, password }) }
    ),

  refresh: (refresh_token: string) =>
    request<TokenPair>(
      `${AUTH_URL}/refresh`,
      { method: "POST", body: JSON.stringify({ refresh_token }) }
    ),

  logout: (refresh_token: string) =>
    request<void>(
      `${AUTH_URL}/logout`,
      { method: "POST", body: JSON.stringify({ refresh_token }) }
    ),
}

// --- Backend service ---

export type ImageStatus = "pending" | "processing" | "ready" | "failed" | "deleted"

export type Image = {
  id: string
  user_id: string
  filename: string
  mime_type: string
  size_bytes: number
  width?: number
  height?: number
  status: ImageStatus
  is_favourited?: boolean
  created_at: string
  updated_at: string
  url?: string
}

export type Album = {
  id: string
  user_id: string
  name: string
  description?: string
  cover_image_id?: string
  image_count: number
  cover_url?: string
  created_at: string
  updated_at: string
}

export type ImagePage = {
  items: Image[]
  total: number
  page: number
  limit: number
}

export type StoryTransition = "fade" | "slide" | "zoom"

export type StorySlide = {
  id: string
  story_id: string
  image_id: string
  position: number
  duration_ms: number
  transition: StoryTransition
  caption?: string
  filename: string
  width?: number
  height?: number
  url?: string
}

export type SpotifyTrack = {
  id: string
  name: string
  artists: string[]
  album_name: string
  album_art_url: string
  duration_ms: number
  preview_url?: string
}

export type Story = {
  id: string
  user_id: string
  title: string
  slide_count: number
  cover_url?: string
  spotify_track_id?: string
  track?: SpotifyTrack
  created_at: string
  updated_at: string
}

export type StoryDetail = Story & { slides: StorySlide[] }

export type SlideInput = {
  image_id: string
  duration_ms: number
  transition: StoryTransition
  caption?: string
}

export type UploadInitResp = {
  image_id: string
  upload_url: string
  expires_in: number
}

export const backendApi = {
  uploadInit: (token: string, filename: string, mime_type: string, size_bytes: number) =>
    request<UploadInitResp>(
      `${BACKEND_URL}/api/upload/init`,
      { method: "POST", body: JSON.stringify({ filename, mime_type, size_bytes }) },
      token
    ),

  uploadComplete: (token: string, image_id: string) =>
    request<{ image_id: string; status: string }>(
      `${BACKEND_URL}/api/upload/complete`,
      { method: "POST", body: JSON.stringify({ image_id }) },
      token
    ),

  uploadStatus: (token: string, id: string) =>
    request<{ image_id: string; status: ImageStatus }>(
      `${BACKEND_URL}/api/upload/status/${id}`,
      {},
      token
    ),

  listMedia: (token: string, page = 1, limit = 20) =>
    request<ImagePage>(
      `${BACKEND_URL}/api/media?page=${page}&limit=${limit}`,
      {},
      token
    ),

  getMedia: (token: string, id: string) =>
    request<Image & { url?: string }>(
      `${BACKEND_URL}/api/media/${id}`,
      {},
      token
    ),

  deleteMedia: (token: string, id: string) =>
    request<void>(
      `${BACKEND_URL}/api/media/${id}`,
      { method: "DELETE" },
      token
    ),

  getGallery: (token: string) =>
    request<{ items: Image[] }>(`${BACKEND_URL}/api/gallery`, {}, token),

  listAlbums: (token: string) =>
    request<{ items: Album[] }>(`${BACKEND_URL}/api/albums`, {}, token),

  createAlbum: (token: string, name: string, description?: string) =>
    request<Album>(
      `${BACKEND_URL}/api/albums`,
      { method: "POST", body: JSON.stringify({ name, description }) },
      token
    ),

  updateAlbum: (token: string, id: string, name: string, description?: string) =>
    request<Album>(
      `${BACKEND_URL}/api/albums/${id}`,
      { method: "PATCH", body: JSON.stringify({ name, description }) },
      token
    ),

  deleteAlbum: (token: string, id: string) =>
    request<void>(
      `${BACKEND_URL}/api/albums/${id}`,
      { method: "DELETE" },
      token
    ),

  listAlbumImages: (token: string, id: string, page = 1, limit = 20) =>
    request<ImagePage>(`${BACKEND_URL}/api/albums/${id}/images?page=${page}&limit=${limit}`, {}, token),

  addAlbumImages: (token: string, albumId: string, imageIds: string[]) =>
    request<void>(
      `${BACKEND_URL}/api/albums/${albumId}/images`,
      { method: "POST", body: JSON.stringify({ image_ids: imageIds }) },
      token
    ),

  removeAlbumImage: (token: string, albumId: string, imageId: string) =>
    request<void>(
      `${BACKEND_URL}/api/albums/${albumId}/images/${imageId}`,
      { method: "DELETE" },
      token
    ),

  listFavourites: (token: string, page = 1, limit = 20) =>
    request<ImagePage>(`${BACKEND_URL}/api/favourites?page=${page}&limit=${limit}`, {}, token),

  addFavourite: (token: string, id: string) =>
    request<void>(`${BACKEND_URL}/api/favourites/${id}`, { method: "POST" }, token),

  removeFavourite: (token: string, id: string) =>
    request<void>(`${BACKEND_URL}/api/favourites/${id}`, { method: "DELETE" }, token),

  listStories: (token: string) =>
    request<{ items: Story[] }>(`${BACKEND_URL}/api/stories`, {}, token),

  createStory: (token: string, title: string) =>
    request<Story>(`${BACKEND_URL}/api/stories`, { method: "POST", body: JSON.stringify({ title }) }, token),

  getStory: (token: string, id: string) =>
    request<StoryDetail>(`${BACKEND_URL}/api/stories/${id}`, {}, token),

  updateStory: (token: string, id: string, title: string, slides: SlideInput[], spotifyTrackId?: string | null) =>
    request<StoryDetail>(
      `${BACKEND_URL}/api/stories/${id}`,
      { method: "PUT", body: JSON.stringify({ title, slides, spotify_track_id: spotifyTrackId ?? null }) },
      token
    ),

  deleteStory: (token: string, id: string) =>
    request<void>(`${BACKEND_URL}/api/stories/${id}`, { method: "DELETE" }, token),

  searchSpotify: (token: string, q: string) =>
    request<{ tracks: SpotifyTrack[] }>(`${BACKEND_URL}/api/spotify/search?q=${encodeURIComponent(q)}`, {}, token),

  publicGallery: (limit = 20) =>
    request<{ items: Image[]; total: number }>(`${BACKEND_URL}/public/gallery?limit=${limit}`),
}
