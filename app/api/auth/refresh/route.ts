import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { authApi } from "@/lib/api"

export async function POST() {
  const jar = await cookies()
  const refresh = jar.get("vault_refresh")?.value

  if (!refresh) {
    return NextResponse.json({ error: "No refresh token" }, { status: 401 })
  }

  try {
    const pair = await authApi.refresh(refresh)

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
  } catch {
    jar.delete("vault_token")
    jar.delete("vault_refresh")
    return NextResponse.json({ error: "Refresh failed" }, { status: 401 })
  }
}
