import { NextResponse } from "next/server"
import { authApi } from "@/lib/api"
import { cookies } from "next/headers"
import { tokenCookieOpts, refreshCookieOpts, TOKEN_COOKIE, REFRESH_COOKIE } from "@/lib/bff-auth"

export async function POST() {
  const jar = await cookies()
  const refresh = jar.get(REFRESH_COOKIE)?.value

  if (!refresh) {
    return NextResponse.json({ error: "No refresh token" }, { status: 401 })
  }

  try {
    const pair = await authApi.refresh(refresh)
    jar.set(TOKEN_COOKIE, pair.access_token, tokenCookieOpts(pair.expires_in))
    jar.set(REFRESH_COOKIE, pair.refresh_token, refreshCookieOpts)
    return NextResponse.json({ ok: true })
  } catch {
    jar.delete(TOKEN_COOKIE)
    jar.delete(REFRESH_COOKIE)
    return NextResponse.json({ error: "Refresh failed" }, { status: 401 })
  }
}
