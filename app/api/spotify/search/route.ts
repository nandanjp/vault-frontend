import { NextRequest, NextResponse } from "next/server"
import { backendApi } from "@/lib/api"
import { getAuthToken } from "@/lib/bff-auth"

export async function GET(req: NextRequest) {
    const token = await getAuthToken()
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const q = req.nextUrl.searchParams.get("q") ?? ""
    if (!q) return NextResponse.json({ error: "q required" }, { status: 400 })
    try {
        const data = await backendApi.searchSpotify(token, q)
        return NextResponse.json(data)
    } catch (err: unknown) {
        const e = err as { status?: number; message?: string }
        return NextResponse.json({ error: e.message ?? "Failed" }, { status: e.status ?? 500 })
    }
}
