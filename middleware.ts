import { NextRequest, NextResponse } from "next/server"

const publicPaths = new Set(["/login", "/register"])

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isPublic = publicPaths.has(pathname)
  const hasToken = request.cookies.has("vault_token")

  if (!hasToken && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  if (hasToken && isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard"
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
