import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-[hsl(43_20%_94%_/_0.14)] text-[hsl(43_20%_94%)]",
        secondary: "bg-[hsl(0_0%_13%)] text-muted-foreground",
        destructive: "bg-[hsl(353_82%_66%_/_0.14)] text-[hsl(353_82%_70%)]",
        success: "bg-[hsl(152_63%_54%_/_0.14)] text-[hsl(152_63%_60%)]",
        warning: "bg-[hsl(40_78%_60%_/_0.14)] text-[hsl(40_78%_66%)]",
        info: "bg-[hsl(210_84%_65%_/_0.14)] text-[hsl(210_84%_72%)]",
        outline: "bg-[hsl(0_0%_13%)] text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  ),
);
Badge.displayName = "Badge";

export { Badge, badgeVariants };
