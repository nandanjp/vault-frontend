"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

async function post(path: string, body: unknown) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw data
  return data
}

export function useLogin() {
  const router = useRouter()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      post("/api/auth/login", { email, password }),
    onSuccess: () => {
      qc.clear()
      router.push("/dashboard")
    },
    onError: (err: { error?: string }) => {
      toast.error(err.error ?? "Invalid email or password")
    },
  })
}

export function useRegister() {
  const router = useRouter()

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      post("/api/auth/register", { email, password }),
    onSuccess: () => {
      toast.success("Account created — please sign in")
      router.push("/login")
    },
    onError: (err: { error?: string }) => {
      toast.error(err.error ?? "Registration failed")
    },
  })
}

export function useLogout() {
  const router = useRouter()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: () => post("/api/auth/logout", {}),
    onSettled: () => {
      qc.clear()
      router.push("/login")
    },
  })
}
