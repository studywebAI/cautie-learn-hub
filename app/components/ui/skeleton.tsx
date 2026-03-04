import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-xl bg-[hsl(var(--surface-3))]", className)}
      {...props}
    />
  )
}

export { Skeleton }
