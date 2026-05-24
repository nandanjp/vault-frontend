import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"
import { authApi } from "@/lib/api"

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    const pair = await authApi.login(email, password)

    const jar = await cookies()
    jar.set("vault_token", pair.access_token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: pair.expires_in,
    })
    jar.set("vault_refresh", pair.refresh_token, {
      httpOnly: true,
      sameSite: "strict",
      path: "/api/auth/refresh",
      maxAge: 60 * 60 * 24 * 7,
    })

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string }
    const status = e.status === 401 ? 401 : 500
    return NextResponse.json({ error: e.message ?? "Login failed" }, { status })
  }
}
