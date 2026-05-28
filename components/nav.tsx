"use client"

import Link from "next/link"
import { Upload, Vault } from "lucide-react"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button, buttonVariants } from "@/components/ui/button"
import { useLogout } from "@/hooks/use-auth"

export function Nav() {
    const logout = useLogout()

    return (
        <header className="border-border bg-background/90 supports-[backdrop-filter]:bg-background/70 sticky top-0 z-50 w-full border-b backdrop-blur">
            <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
                <Link
                    href="/dashboard"
                    className="text-foreground flex items-center gap-2 font-semibold tracking-tight transition-opacity hover:opacity-80"
                >
                    <Vault className="text-primary size-4" />
                    <span>vault</span>
                </Link>

                <div className="flex items-center gap-1">
                    <Link
                        href="/upload"
                        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-2")}
                    >
                        <Upload className="size-4" />
                        Upload
                    </Link>
                    <ThemeToggle />
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => logout.mutate()}
                        disabled={logout.isPending}
                    >
                        Sign out
                    </Button>
                </div>
            </div>
        </header>
    )
}
