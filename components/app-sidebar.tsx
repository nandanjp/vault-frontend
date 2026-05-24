"use client"

import { createContext, useContext, useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import {
  Vault, Images, FolderOpen, Heart, Upload,
  LogOut, ChevronLeft, ChevronRight, Menu, X, Sun, Moon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useLogout } from "@/hooks/use-auth"

// ---------- context ----------

type SidebarCtx = { mobileOpen: boolean; openMobile: () => void; closeMobile: () => void }
const SidebarContext = createContext<SidebarCtx>({
  mobileOpen: false,
  openMobile: () => {},
  closeMobile: () => {},
})
export function useSidebar() { return useContext(SidebarContext) }
export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  return (
    <SidebarContext.Provider value={{
      mobileOpen,
      openMobile: () => setMobileOpen(true),
      closeMobile: () => setMobileOpen(false),
    }}>
      {children}
    </SidebarContext.Provider>
  )
}

// ---------- nav items ----------

const navItems = [
  { href: "/dashboard", icon: Images, label: "Home" },
  { href: "/photos", icon: Images, label: "All Photos" },
  { href: "/albums", icon: FolderOpen, label: "Albums" },
  { href: "/favourites", icon: Heart, label: "Favourites" },
]

const navItemClass = (active: boolean, collapsed: boolean) =>
  cn(
    "flex w-full items-center gap-3 rounded-lg py-2.5 text-sm font-medium transition-all duration-150",
    !collapsed && active  && "border-l-2 border-primary bg-primary/[.07] pl-2.5 pr-3 text-foreground",
    !collapsed && !active && "px-3 text-muted-foreground hover:bg-muted hover:text-foreground",
    collapsed  && active  && "justify-center px-2 bg-primary/[.07] text-foreground",
    collapsed  && !active && "justify-center px-2 text-muted-foreground hover:bg-muted hover:text-foreground",
  )

// ---------- sidebar ----------

export function AppSidebar() {
  const pathname = usePathname()
  const logout = useLogout()
  const { mobileOpen, closeMobile } = useSidebar()
  const { theme, setTheme } = useTheme()

  const [collapsed, setCollapsed] = useState(false)
  useEffect(() => {
    const stored = localStorage.getItem("vault-sidebar-collapsed")
    if (stored !== null) setCollapsed(stored === "true")
  }, [])
  const toggleCollapsed = () =>
    setCollapsed((c) => {
      const next = !c
      localStorage.setItem("vault-sidebar-collapsed", String(next))
      return next
    })

  const w = collapsed ? "w-[56px]" : "w-56"

  const NavList = (
    <nav className="flex-1 space-y-0.5 p-2">
      {navItems.map(({ href, icon: Icon, label }) => {
        const active = href === "/dashboard"
          ? pathname === "/dashboard"
          : pathname === href || pathname.startsWith(href + "/")
        return (
          <Link key={href} href={href} onClick={closeMobile} className={navItemClass(active, collapsed)}>
            <Icon className="size-4 shrink-0" />
            {!collapsed && label}
          </Link>
        )
      })}
    </nav>
  )

  const BottomActions = (
    <div className="border-t border-border p-2 space-y-0.5">
      <Link
        href="/upload"
        onClick={closeMobile}
        className={navItemClass(false, collapsed)}
      >
        <Upload className="size-4 shrink-0" />
        {!collapsed && "Upload"}
      </Link>

      <button
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className={navItemClass(false, collapsed)}
      >
        <Sun className="size-4 shrink-0 dark:hidden" />
        <Moon className="hidden size-4 shrink-0 dark:block" />
        {!collapsed && "Theme"}
      </button>

      <button
        onClick={() => { logout.mutate(); closeMobile() }}
        disabled={logout.isPending}
        className={navItemClass(false, collapsed)}
      >
        <LogOut className="size-4 shrink-0" />
        {!collapsed && "Sign out"}
      </button>
    </div>
  )

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={closeMobile} />
      )}

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "relative hidden h-screen flex-col border-r border-border bg-card transition-all duration-200 lg:flex",
          w
        )}
      >
        <SidebarHeader collapsed={collapsed} />
        {NavList}
        {BottomActions}
        <button
          onClick={toggleCollapsed}
          className="absolute -right-3 top-[60px] flex size-6 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm hover:text-foreground transition-colors z-10"
        >
          {collapsed ? <ChevronRight className="size-3" /> : <ChevronLeft className="size-3" />}
        </button>
      </aside>

      {/* Mobile drawer */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-full w-56 flex-col border-r border-border bg-card transition-transform duration-200 lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <Link href="/dashboard" onClick={closeMobile} className="flex items-center gap-2 font-semibold">
            <Vault className="size-4 text-primary" />
            vault
          </Link>
          <button onClick={closeMobile} className="text-muted-foreground hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>
        {NavList}
        {BottomActions}
      </aside>
    </>
  )
}

function SidebarHeader({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="flex h-14 items-center border-b border-border px-4 shrink-0">
      <Link href="/dashboard" className="flex items-center gap-2.5 font-semibold tracking-tight overflow-hidden">
        <Vault className="size-4 shrink-0 text-primary" />
        {!collapsed && <span className="truncate">vault</span>}
      </Link>
    </div>
  )
}

// ---------- mobile top bar ----------

export function MobileTopBar() {
  const { openMobile } = useSidebar()
  return (
    <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur lg:hidden">
      <button onClick={openMobile} className="text-muted-foreground hover:text-foreground transition-colors">
        <Menu className="size-5" />
      </button>
      <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
        <Vault className="size-4 text-primary" />
        vault
      </Link>
    </div>
  )
}
