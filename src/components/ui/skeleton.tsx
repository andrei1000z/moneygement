import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "shimmer rounded-[--radius] bg-[oklch(from_var(--foreground)_l_c_h/0.05)]",
        className,
      )}
      {...props}
    />
  )
}

export { Skeleton }
