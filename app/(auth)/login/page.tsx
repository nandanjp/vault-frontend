"use client"

import { useState } from "react"
import Link from "next/link"
import { useLogin } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

export default function LoginPage() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const login = useLogin()

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        login.mutate({ email, password })
    }

    return (
        <Card className="w-full max-w-sm shadow-lg">
            <CardHeader>
                <CardTitle className="text-xl">Sign in</CardTitle>
                <CardDescription>Enter your credentials to continue</CardDescription>
            </CardHeader>

            <form onSubmit={handleSubmit}>
                <CardContent className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="you@example.com"
                            autoComplete="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="password">Password</Label>
                        <Input
                            id="password"
                            type="password"
                            placeholder="••••••••"
                            autoComplete="current-password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                </CardContent>

                <CardFooter className="flex flex-col gap-3 border-none bg-transparent px-4 pb-4">
                    <Button type="submit" className="w-full" size="lg" disabled={login.isPending}>
                        {login.isPending ? "Signing in…" : "Sign in"}
                    </Button>

                    <p className="text-muted-foreground text-center text-sm">
                        Don&apos;t have an account?{" "}
                        <Link
                            href="/register"
                            className="text-foreground underline-offset-4 hover:underline"
                        >
                            Create one
                        </Link>
                    </p>
                </CardFooter>
            </form>
        </Card>
    )
}
