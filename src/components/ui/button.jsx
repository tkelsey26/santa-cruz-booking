import { forwardRef } from 'react'
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sea-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:     'bg-sea-500 text-white hover:bg-sea-600',
        destructive: 'bg-rose-500 text-white hover:bg-rose-600',
        outline:     'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900',
        secondary:   'bg-sea-50 text-sea-700 hover:bg-sea-100',
        ghost:       'text-slate-700 hover:bg-slate-100 hover:text-slate-900',
        link:        'text-sea-600 underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm:      'h-8 px-3 text-xs',
        lg:      'h-10 px-6',
        icon:    'h-9 w-9',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
)

const Button = forwardRef(({ className, variant, size, ...props }, ref) => (
  <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
))
Button.displayName = 'Button'

export { Button, buttonVariants }
