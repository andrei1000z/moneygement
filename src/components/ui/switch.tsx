"use client"

import * as React from "react"
import { Switch as SwitchPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

/**
 * iOS-style switch:
 * - track: rounded-pill, default 12 / 7 (48 / 28 px)
 * - thumb: rounded-full, size 6 (24 px) cu shadow-md
 * - checked: bg gradient emerald → cyan
 * - off: bg-foreground/20
 * - spring transition (cubic-bezier custom pentru iOS bounce)
 */
function Switch({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: "sm" | "default"
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer group/switch relative inline-flex shrink-0 cursor-pointer items-center rounded-full border border-transparent outline-none after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
        "transition-[background-color,box-shadow] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
        // Sizes
        "data-[size=default]:h-7 data-[size=default]:w-12 data-[size=sm]:h-5 data-[size=sm]:w-9",
        // States
        "data-checked:bg-gradient-to-br data-checked:from-[--accent-emerald] data-checked:to-[--accent-cyan]",
        "data-checked:shadow-[inset_0_1px_2px_oklch(0_0_0/0.15),0_0_0_1px_oklch(from_var(--accent-emerald)_l_c_h/0.3),0_0_16px_-2px_oklch(from_var(--accent-emerald)_l_c_h/0.4)]",
        "data-unchecked:bg-[oklch(from_var(--foreground)_l_c_h/0.18)]",
        "data-unchecked:shadow-[inset_0_1px_2px_oklch(0_0_0/0.1)]",
        "data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block rounded-full bg-white shadow-[0_1px_2px_oklch(0_0_0/0.2),0_2px_4px_oklch(0_0_0/0.15)] ring-0",
          "transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
          "group-data-[size=default]/switch:size-6 group-data-[size=sm]/switch:size-4",
          "group-data-[size=default]/switch:data-checked:translate-x-[calc(100%-2px)] group-data-[size=sm]/switch:data-checked:translate-x-[calc(100%-2px)]",
          "group-data-[size=default]/switch:data-unchecked:translate-x-0.5 group-data-[size=sm]/switch:data-unchecked:translate-x-0.5",
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
