// Deduplicate concurrent 401s — only one refresh flight at a time.
let refreshing: Promise<boolean> | null = null

async function tryRefresh(): Promise<boolean> {
  if (refreshing) return refreshing
  refreshing = fetch("/api/auth/refresh", { method: "POST" })
    .then((r) => r.ok)
    .catch(() => false)
    .finally(() => { refreshing = null })
  return refreshing
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init)

  if (res.status === 401) {
    const ok = await tryRefresh()
    if (ok) {
      const retry = await fetch(path, init)
      if (retry.status === 401) {
        window.location.href = "/login"
        throw new Error("Unauthorized")
      }
      if (!retry.ok) {
        const body = await retry.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? retry.statusText)
      }
      if (retry.status === 204) return undefined as T
      return retry.json() as Promise<T>
    }
    window.location.href = "/login"
    throw new Error("Unauthorized")
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { error?: string }).error ?? res.statusText)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}
