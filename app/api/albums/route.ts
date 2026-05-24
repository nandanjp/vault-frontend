import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"
import { backendApi } from "@/lib/api"

export async function GET() {
  const jar = await cookies()
  const token = jar.get("vault_token")?.value
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    const data = await backendApi.listAlbums(token)
    return NextResponse.json(data)
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string }
    return NextResponse.json({ error: e.message ?? "Failed" }, { status: e.status ?? 500 })
  }
}

export async function POST(req: NextRequest) {
  const jar = await cookies()
  const token = jar.get("vault_token")?.value
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    const { name, description } = await req.json()
    const data = await backendApi.createAlbum(token, name, description)
    return NextResponse.json(data, { status: 201 })
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string }
    return NextResponse.json({ error: e.message ?? "Failed" }, { status: e.status ?? 500 })
  }
}
