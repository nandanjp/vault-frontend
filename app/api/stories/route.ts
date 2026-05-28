import { NextRequest, NextResponse } from "next/server"
import { backendApi } from "@/lib/api"
import { getAuthToken } from "@/lib/bff-auth"

export async function GET() {
    const token = await getAuthToken()
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    try {
        const data = await backendApi.listStories(token)
        return NextResponse.json(data)
    } catch (err: unknown) {
        const e = err as { status?: number; message?: string }
        return NextResponse.json({ error: e.message ?? "Failed" }, { status: e.status ?? 500 })
    }
}

export async function POST(req: NextRequest) {
    const token = await getAuthToken()
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    try {
        const { title } = await req.json()
        const data = await backendApi.createStory(token, title ?? "Untitled Story")
        return NextResponse.json(data, { status: 201 })
    } catch (err: unknown) {
        const e = err as { status?: number; message?: string }
        return NextResponse.json({ error: e.message ?? "Failed" }, { status: e.status ?? 500 })
    }
}
