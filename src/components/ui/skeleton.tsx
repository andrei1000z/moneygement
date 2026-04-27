import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "shimmer rounded-(--radius) bg-(--surface-tint)",
        className,
      )}
      {...props}
    />
  )
}

export { Skeleton }
