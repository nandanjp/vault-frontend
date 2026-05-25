import { NextResponse } from "next/server"
import { backendApi } from "@/lib/api"

export async function GET() {
  try {
    const data = await backendApi.publicGallery()
    return NextResponse.json(data)
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string }
    return NextResponse.json({ error: e.message ?? "Failed" }, { status: e.status ?? 500 })
  }
}
