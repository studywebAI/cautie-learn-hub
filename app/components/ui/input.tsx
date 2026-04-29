import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
        <input
          type={type}
          className={cn(
          "flex h-9 w-full rounded-xl surface-panel px-3 py-2 text-[15px] leading-[1.4667] text-foreground/95 ring-offset-background file:border-0 file:bg-transparent file:text-[15px] file:font-normal file:text-foreground placeholder:text-transparent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
