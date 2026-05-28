import { NextRequest, NextResponse } from "next/server"
import { authApi } from "@/lib/api"

export async function POST(req: NextRequest) {
    try {
        const { email, password } = await req.json()
        const user = await authApi.register(email, password)
        return NextResponse.json(user, { status: 201 })
    } catch (err: unknown) {
        const e = err as { status?: number; message?: string }
        const status = e.status === 409 ? 409 : 500
        return NextResponse.json({ error: e.message ?? "Registration failed" }, { status })
    }
}
