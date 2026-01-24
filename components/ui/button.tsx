import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-300 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 hover:shadow-primary/30 hover:shadow-xl dark:shadow-primary/10 dark:hover:shadow-primary/20",
        destructive:
          "bg-destructive text-white shadow-lg shadow-destructive/20 hover:bg-destructive/90 hover:shadow-destructive/30 dark:bg-destructive/80 dark:hover:bg-destructive/70",
        outline:
          "border-2 border-input bg-background/50 backdrop-blur-sm shadow-sm hover:bg-accent hover:text-accent-foreground hover:border-accent-foreground/20 dark:bg-input/20 dark:border-input dark:hover:bg-input/40",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 hover:shadow-md",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
        glow:
          "bg-gradient-to-r from-violet-600 to-cyan-600 text-white shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/40 hover:from-violet-500 hover:to-cyan-500 dark:from-violet-500 dark:to-cyan-500 dark:shadow-violet-500/20 dark:hover:shadow-violet-500/35",
        cyber:
          "bg-cyan-600 text-white shadow-lg shadow-cyan-500/25 hover:bg-cyan-500 hover:shadow-xl hover:shadow-cyan-500/40 dark:bg-cyan-500 dark:hover:bg-cyan-400",
        neon:
          "bg-emerald-600 text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-500 hover:shadow-xl hover:shadow-emerald-500/40 dark:bg-emerald-500 dark:hover:bg-emerald-400",
        electric:
          "bg-purple-600 text-white shadow-lg shadow-purple-500/25 hover:bg-purple-500 hover:shadow-xl hover:shadow-purple-500/40 dark:bg-purple-500 dark:hover:bg-purple-400",
      },
      size: {
        default: "h-10 px-5 py-2.5",
        sm: "h-9 rounded-lg gap-1.5 px-4 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        xl: "h-14 rounded-xl px-10 text-lg font-semibold",
        icon: "size-10 rounded-lg",
        "icon-sm": "size-9 rounded-md",
        "icon-lg": "size-12 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
