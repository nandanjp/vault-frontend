import { NextRequest, NextResponse } from "next/server"
import { backendApi } from "@/lib/api"

export async function GET(req: NextRequest) {
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? "20")
  try {
    const data = await backendApi.publicGallery(limit)
    return NextResponse.json(data)
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string }
    return NextResponse.json({ error: e.message ?? "Failed" }, { status: e.status ?? 500 })
  }
}
