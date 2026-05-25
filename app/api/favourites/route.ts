import { NextRequest, NextResponse } from "next/server"
import { backendApi } from "@/lib/api"
import { getAuthToken } from "@/lib/bff-auth"

export async function GET(req: NextRequest) {
  const token = await getAuthToken()
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    const page = Number(req.nextUrl.searchParams.get("page") ?? 1)
    const limit = Number(req.nextUrl.searchParams.get("limit") ?? 20)
    const data = await backendApi.listFavourites(token, page, limit)
    return NextResponse.json(data)
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string }
    return NextResponse.json({ error: e.message ?? "Failed" }, { status: e.status ?? 500 })
  }
}
