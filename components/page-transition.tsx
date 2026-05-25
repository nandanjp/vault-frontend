"use client"

import { useRef, useEffect } from "react"
import { usePathname } from "next/navigation"
import gsap from "@/lib/gsap"

export function PageTransition({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  useEffect(() => {
    if (!ref.current) return
    gsap.fromTo(
      ref.current,
      { opacity: 0 },
      { opacity: 1, duration: 0.38, ease: "power2.out" }
    )
  }, [pathname])

  return <div ref={ref} className="h-full">{children}</div>
}
