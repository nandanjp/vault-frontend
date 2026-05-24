// Computes once at import time — works on both server (Buffer) and client (btoa).
const toBase64 = (s: string) =>
  typeof window !== "undefined"
    ? window.btoa(s)
    : Buffer.from(s).toString("base64")

// A 4×4 neutral-grey SVG. Next.js scales + blurs it to fill the slot,
// so colour precision doesn't matter — it just needs to look like a soft grey wash.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4">
  <rect width="4" height="4" fill="#71717a" opacity="0.25"/>
</svg>`

export const shimmerPlaceholder = `data:image/svg+xml;base64,${toBase64(svg)}`
