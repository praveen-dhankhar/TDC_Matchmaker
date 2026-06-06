'use client';

import { CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastProps = {
  message: string | null;
  tone?: 'success' | 'error';
};

export function Toast({ message, tone = 'success' }: ToastProps) {
  if (!message) return null;

  return (
    <div
      className={cn(
        'fixed bottom-5 right-5 z-50 flex max-w-sm items-start gap-3 rounded-lg border bg-white px-4 py-3 text-sm shadow-soft',
        tone === 'success' ? 'border-sage/25 text-sage' : 'border-blush/25 text-blush'
      )}
      role="status"
    >
      {tone === 'success' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
      <span>{message}</span>
    </div>
  );
}
