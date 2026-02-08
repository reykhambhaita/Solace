import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1.5 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-all duration-200 overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow-sm [a&]:hover:bg-primary/90 [a&]:hover:shadow-md",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "border-transparent bg-destructive/90 text-white shadow-sm shadow-destructive/20 [a&]:hover:bg-destructive focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/70",
        outline:
          "text-foreground bg-background/50 backdrop-blur-sm [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        success:
          "border-transparent bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/20",
        warning:
          "border-transparent bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20",
        info:
          "border-transparent bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20",
        purple:
          "border-transparent bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
        cyan:
          "border-transparent bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/20",
        glow:
          "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 shadow-sm shadow-blue-500/10",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
