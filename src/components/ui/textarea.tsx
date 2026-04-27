import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "glass-thin field-sizing-content flex min-h-20 w-full rounded-(--radius) border border-input px-4 py-3 text-base outline-none",
        "transition-[border-color,box-shadow,background-color] duration-200",
        "placeholder:text-muted-foreground",
        "focus-visible:border-(--tint-emerald-half) focus-visible:ring-3 focus-visible:ring-(--tint-emerald)",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
        "md:text-sm",
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
