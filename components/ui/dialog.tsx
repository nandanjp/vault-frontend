"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

function Dialog({ ...props }: DialogPrimitive.Root.Props) {
    return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
    return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
    return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogOverlay({ className, ...props }: DialogPrimitive.Backdrop.Props) {
    return (
        <DialogPrimitive.Backdrop
            data-slot="dialog-overlay"
            className={cn(
                "data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 fixed inset-0 isolate z-50 bg-black/50 backdrop-blur-sm duration-100",
                className
            )}
            {...props}
        />
    )
}

function DialogContent({ className, children, ...props }: DialogPrimitive.Popup.Props) {
    return (
        <DialogPortal>
            <DialogOverlay />
            <DialogPrimitive.Popup
                data-slot="dialog-content"
                className={cn(
                    "bg-popover text-popover-foreground ring-foreground/10 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 fixed top-1/2 left-1/2 z-50 flex max-h-[85dvh] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl shadow-2xl ring-1 duration-100 outline-none",
                    className
                )}
                {...props}
            >
                {children}
            </DialogPrimitive.Popup>
        </DialogPortal>
    )
}

function DialogClose({
    className,
    ...props
}: DialogPrimitive.Close.Props & { className?: string }) {
    return (
        <DialogPrimitive.Close
            data-slot="dialog-close"
            className={cn(
                "text-muted-foreground hover:bg-muted hover:text-foreground flex size-7 items-center justify-center rounded-lg transition-colors",
                className
            )}
            {...props}
        >
            <X className="size-4" />
        </DialogPrimitive.Close>
    )
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
    return (
        <DialogPrimitive.Title
            data-slot="dialog-title"
            className={cn("text-base font-semibold", className)}
            {...props}
        />
    )
}

function DialogDescription({
    className,
    ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
    return (
        <DialogPrimitive.Description
            data-slot="dialog-description"
            className={cn("text-muted-foreground text-sm", className)}
            {...props}
        />
    )
}

export {
    Dialog,
    DialogTrigger,
    DialogPortal,
    DialogOverlay,
    DialogContent,
    DialogClose,
    DialogTitle,
    DialogDescription,
}
