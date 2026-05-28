import { cookies } from "next/headers"
import { authApi } from "@/lib/api"

export const TOKEN_COOKIE = "vault_token"
export const REFRESH_COOKIE = "vault_refresh"

export const tokenCookieOpts = (maxAge: number) => ({
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge,
})

export const refreshCookieOpts = {
    httpOnly: true,
    sameSite: "strict" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
}

// Returns a valid access token, transparently refreshing if the access cookie
// is missing but a refresh token is present. Returns null only when both are
// absent or the refresh itself fails (in which case both cookies are cleared).
export async function getAuthToken(): Promise<string | null> {
    const jar = await cookies()

    const access = jar.get(TOKEN_COOKIE)?.value
    if (access) return access

    const refresh = jar.get(REFRESH_COOKIE)?.value
    if (!refresh) return null

    try {
        const pair = await authApi.refresh(refresh)
        jar.set(TOKEN_COOKIE, pair.access_token, tokenCookieOpts(pair.expires_in))
        jar.set(REFRESH_COOKIE, pair.refresh_token, refreshCookieOpts)
        return pair.access_token
    } catch {
        jar.delete(TOKEN_COOKIE)
        jar.delete(REFRESH_COOKIE)
        return null
    }
}
