import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { authApi } from "@/lib/api"

export async function POST() {
  const jar = await cookies()
  const refresh = jar.get("vault_refresh")?.value

  if (refresh) {
    await authApi.logout(refresh).catch(() => {})
  }

  jar.delete("vault_token")
  jar.delete("vault_refresh")

  return NextResponse.json({ ok: true })
}
