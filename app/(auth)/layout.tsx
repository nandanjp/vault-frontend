import Link from "next/link"
import { ThemeToggle } from "@/components/theme-toggle"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="bg-background relative min-h-screen">
            <div className="absolute top-4 right-4">
                <ThemeToggle />
            </div>

            {/* Subtle grid background */}
            <div
                className="pointer-events-none absolute inset-0 opacity-[0.03] dark:opacity-[0.06]"
                style={{
                    backgroundImage:
                        "linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)",
                    backgroundSize: "64px 64px",
                }}
            />

            <div className="relative flex min-h-screen flex-col items-center justify-center px-4">
                {/* Logo */}
                <Link href="/" className="text-foreground mb-8 flex items-center gap-2">
                    <div className="bg-primary flex size-8 items-center justify-center rounded-lg">
                        <span className="text-primary-foreground text-sm font-bold">V</span>
                    </div>
                    <span className="text-xl font-semibold tracking-tight">Vault</span>
                </Link>

                {children}
            </div>
        </div>
    )
}
