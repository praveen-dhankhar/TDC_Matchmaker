'use client';

import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

type ModalProps = {
  title: string;
  children: ReactNode;
  open: boolean;
  onClose: () => void;
  className?: string;
};

export function Modal({ title, children, open, onClose, className }: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 py-6">
      <div className={cn('panel max-h-[90vh] w-full max-w-2xl overflow-auto', className)}>
        <div className="flex items-center justify-between border-b border-black/10 px-5 py-4">
          <h2 className="text-lg font-semibold text-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-muted transition hover:bg-black/5 hover:text-ink"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
      </div>
    </div>
  );
}
