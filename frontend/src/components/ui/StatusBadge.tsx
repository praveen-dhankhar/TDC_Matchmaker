import { cn, labelTone, statusTone } from '@/lib/utils';

type StatusBadgeProps = {
  value: string;
  kind?: 'status' | 'label';
  className?: string;
};

export function StatusBadge({ value, kind = 'status', className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold',
        kind === 'label' ? labelTone(value) : statusTone(value),
        className
      )}
    >
      {value}
    </span>
  );
}
