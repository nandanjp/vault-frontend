"use client"

import { useState } from "react"
import Image, { type ImageProps } from "next/image"
import { cn } from "@/lib/utils"
import { shimmerPlaceholder } from "@/lib/image-placeholder"

// Drop-in replacement for Next.js Image with shimmer placeholder + fade-in baked in.
// Enforces unoptimized (presigned URLs) and blur placeholder across the whole app.
type VaultImageProps = Omit<ImageProps, "placeholder" | "blurDataURL" | "unoptimized">

export function VaultImage({ className, onLoad, alt, ...props }: VaultImageProps) {
    const [loaded, setLoaded] = useState(false)
    return (
        <Image
            alt={alt}
            placeholder="blur"
            blurDataURL={shimmerPlaceholder}
            unoptimized
            className={cn(
                "transition-opacity duration-300",
                loaded ? "opacity-100" : "opacity-0",
                className
            )}
            onLoad={(e) => {
                setLoaded(true)
                onLoad?.(e as React.SyntheticEvent<HTMLImageElement>)
            }}
            {...props}
        />
    )
}
