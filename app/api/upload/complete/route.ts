import { NextRequest, NextResponse } from "next/server"
import { backendApi } from "@/lib/api"
import { getAuthToken } from "@/lib/bff-auth"

export async function POST(req: NextRequest) {
  const token = await getAuthToken()
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { image_id } = await req.json()
    const data = await backendApi.uploadComplete(token, image_id)
    return NextResponse.json(data)
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string }
    return NextResponse.json({ error: e.message ?? "Failed" }, { status: e.status ?? 500 })
  }
}
