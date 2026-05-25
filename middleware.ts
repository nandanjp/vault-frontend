import { NextRequest, NextResponse } from "next/server"

const publicPaths = new Set(["/login", "/register"])
const AUTH_URL = process.env.AUTH_URL ?? "http://localhost:3002"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isPublic = publicPaths.has(pathname)
  const hasToken = request.cookies.has("vault_token")

  if (hasToken && isPublic) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  if (!hasToken && !isPublic) {
    const refreshToken = request.cookies.get("vault_refresh")?.value
    if (refreshToken) {
      try {
        const res = await fetch(`${AUTH_URL}/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refreshToken }),
        })
        if (res.ok) {
          const pair = await res.json() as {
            access_token: string
            refresh_token: string
            expires_in: number
          }
          const response = NextResponse.next()
          response.cookies.set("vault_token", pair.access_token, {
            httpOnly: true,
            sameSite: "lax",
            path: "/",
            maxAge: pair.expires_in,
          })
          response.cookies.set("vault_refresh", pair.refresh_token, {
            httpOnly: true,
            sameSite: "strict",
            path: "/",
            maxAge: 60 * 60 * 24 * 7,
          })
          return response
        }
      } catch {
        // Auth service unreachable — fall through to login redirect
      }
    }
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
