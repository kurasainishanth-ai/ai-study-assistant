import React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-violet-600/20 text-violet-300",
        secondary: "border-transparent bg-slate-800 text-slate-300 hover:bg-slate-700",
        destructive: "border-transparent bg-rose-500/20 text-rose-400",
        outline: "text-slate-300 border-slate-700",
        success: "border-transparent bg-emerald-500/20 text-emerald-400",
        cyan: "border-transparent bg-cyan-500/20 text-cyan-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({ className, variant, ...props }) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
