import { NextRequest, NextResponse } from "next/server"
import { getAuthToken } from "@/lib/bff-auth"

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3001"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const token = await getAuthToken()
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const filter = req.nextUrl.searchParams.get("filter") ?? ""

    const upstream = await fetch(
        `${BACKEND_URL}/api/media/${id}/transform?filter=${encodeURIComponent(filter)}`,
        { headers: { Authorization: `Bearer ${token}` } }
    )

    if (!upstream.ok) {
        const body = await upstream.json().catch(() => ({}))
        return NextResponse.json(
            { error: body.error ?? "Transform failed" },
            { status: upstream.status }
        )
    }

    const disposition =
        upstream.headers.get("Content-Disposition") ?? `attachment; filename="filtered.jpg"`
    return new NextResponse(upstream.body, {
        headers: {
            "Content-Type": "image/jpeg",
            "Content-Disposition": disposition,
        },
    })
}
