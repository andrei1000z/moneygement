import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "glass-thin field-sizing-content flex min-h-20 w-full rounded-xl border border-input px-3.5 py-2.5 text-base outline-none",
        "transition-[border-color,box-shadow,background-color] duration-200",
        "placeholder:text-muted-foreground",
        "focus-visible:border-[oklch(from_var(--accent-emerald)_l_c_h/0.5)] focus-visible:ring-3 focus-visible:ring-[oklch(from_var(--accent-emerald)_l_c_h/0.2)]",
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
