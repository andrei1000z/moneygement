import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-0.5 text-[11px] font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default:
          "bg-[oklch(from_var(--accent-emerald)_l_c_h/0.18)] text-[--accent-emerald] border-[oklch(from_var(--accent-emerald)_l_c_h/0.25)]",
        secondary: "glass-thin text-foreground",
        destructive:
          "bg-destructive/15 text-destructive border-destructive/25 [a]:hover:bg-destructive/25",
        outline:
          "border-border text-foreground [a]:hover:bg-[oklch(from_var(--foreground)_l_c_h/0.05)]",
        ghost:
          "hover:bg-[oklch(from_var(--foreground)_l_c_h/0.06)] hover:text-foreground",
        emerald:
          "bg-[oklch(from_var(--accent-emerald)_l_c_h/0.18)] text-[--accent-emerald] border-[oklch(from_var(--accent-emerald)_l_c_h/0.3)]",
        violet:
          "bg-[oklch(from_var(--accent-violet)_l_c_h/0.18)] text-[--accent-violet] border-[oklch(from_var(--accent-violet)_l_c_h/0.3)]",
        cyan:
          "bg-[oklch(from_var(--accent-cyan)_l_c_h/0.18)] text-[--accent-cyan] border-[oklch(from_var(--accent-cyan)_l_c_h/0.3)]",
        amber:
          "bg-[oklch(from_var(--accent-amber)_l_c_h/0.18)] text-[--accent-amber] border-[oklch(from_var(--accent-amber)_l_c_h/0.3)]",
        pink:
          "bg-[oklch(from_var(--accent-pink)_l_c_h/0.18)] text-[--accent-pink] border-[oklch(from_var(--accent-pink)_l_c_h/0.3)]",
        link: "text-primary underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
