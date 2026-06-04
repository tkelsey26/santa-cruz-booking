import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default:     'border-transparent bg-sea-500 text-white',
        secondary:   'border-transparent bg-sea-50 text-sea-700',
        outline:     'border-slate-200 text-slate-700',
        approved:    'border-transparent bg-emerald-50 text-emerald-700',
        pending:     'border-transparent bg-amber-50 text-amber-700',
        rejected:    'border-transparent bg-rose-50 text-rose-700',
        blocked:     'border-transparent bg-slate-100 text-slate-600',
        admin:       'border-transparent bg-violet-50 text-violet-700',
        priority:    'border-transparent bg-amber-50 text-amber-700',
        regular:     'border-transparent bg-slate-100 text-slate-600',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

function Badge({ className, variant, ...props }) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
