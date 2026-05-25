import { NextRequest, NextResponse } from "next/server"
import { authApi } from "@/lib/api"
import { cookies } from "next/headers"
import { tokenCookieOpts, refreshCookieOpts, TOKEN_COOKIE, REFRESH_COOKIE } from "@/lib/bff-auth"

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    const pair = await authApi.login(email, password)

    const jar = await cookies()
    jar.set(TOKEN_COOKIE, pair.access_token, tokenCookieOpts(pair.expires_in))
    jar.set(REFRESH_COOKIE, pair.refresh_token, refreshCookieOpts)

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string }
    const status = e.status === 401 ? 401 : 500
    return NextResponse.json({ error: e.message ?? "Login failed" }, { status })
  }
}
