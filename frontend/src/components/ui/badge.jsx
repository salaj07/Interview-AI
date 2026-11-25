import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#FF6500] focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-[#FF6500] text-white shadow hover:bg-[#FF6500]/80",
        secondary: "border-transparent bg-[#1A1A1A] text-white hover:bg-[#1A1A1A]/80",
        destructive: "border-transparent bg-[#E84A5F] text-white shadow hover:bg-[#E84A5F]/80",
        outline: "border-[#262626] text-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({ className, variant, ...props }) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };

