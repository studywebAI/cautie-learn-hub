import { cn } from "@/lib/utils"

type SkeletonVariant = 'default' | 'text' | 'title' | 'card' | 'circle' | 'button';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: SkeletonVariant;
}

function Skeleton({
  className,
  variant = 'default',
  ...props
}: SkeletonProps) {
  const baseClasses = "animate-pulse bg-muted";

  const variantClasses: Record<SkeletonVariant, string> = {
    default: "rounded-md",
    text: "h-4 rounded-md w-full",
    title: "h-8 rounded-lg w-3/4",
    card: "rounded-xl h-48 w-full",
    circle: "rounded-full h-10 w-10",
    button: "h-10 rounded-lg w-24",
  };

  return (
    <div
      className={cn(baseClasses, variantClasses[variant], className)}
      {...props}
    />
  )
}

// Skeleton loading group component
function SkeletonGroup({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("space-y-3", className)} {...props}>
      {children}
    </div>
  );
}

// Card skeleton loader
function SkeletonCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-lg border border-border p-4 space-y-4", className)} {...props}>
      <Skeleton variant="title" className="w-2/3" />
      <SkeletonGroup>
        <Skeleton variant="text" />
        <Skeleton variant="text" className="w-5/6" />
        <Skeleton variant="text" className="w-4/6" />
      </SkeletonGroup>
      <Skeleton variant="button" className="w-full" />
    </div>
  );
}

export { Skeleton, SkeletonGroup, SkeletonCard }
