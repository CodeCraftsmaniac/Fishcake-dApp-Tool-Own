import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-destructive text-destructive-foreground',
        outline: 'text-foreground',
        fcc: 'border-fishcake-500/20 bg-fishcake-500/10 text-fishcake-500',
        usdt: 'border-green-500/20 bg-green-500/10 text-green-500',
        pol: 'border-purple-500/20 bg-purple-500/10 text-purple-500',
        active: 'border-green-500/20 bg-green-500/10 text-green-500',
        expired: 'border-yellow-500/20 bg-yellow-500/10 text-yellow-500',
        finished: 'border-red-500/20 bg-red-500/10 text-red-500',
        pro: 'border-amber-500/20 bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-500',
        basic: 'border-blue-500/20 bg-blue-500/10 text-blue-500',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
