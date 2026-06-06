'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, UsersRound } from 'lucide-react';
import { api } from '@/lib/api';
import type { SessionUser } from '@/lib/types';

type AppHeaderProps = {
  user: SessionUser | null;
};

export function AppHeader({ user }: AppHeaderProps) {
  const router = useRouter();

  async function handleLogout() {
    try {
      await api.logout();
    } finally {
      router.replace('/login');
    }
  }

  return (
    <header className="border-b border-black/10 bg-white/85 backdrop-blur">
      <div className="app-container flex min-h-16 items-center justify-between gap-4">
        <Link href="/dashboard" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blush text-white">
            <UsersRound size={20} />
          </span>
          <span>
            <span className="block text-sm font-semibold text-ink">The Date Crew</span>
            <span className="block text-xs text-muted">Matchmaker Console</span>
          </span>
        </Link>

        <div className="flex items-center gap-3">
          {user ? (
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-ink">{user.name}</p>
              <p className="text-xs text-muted">{user.email}</p>
            </div>
          ) : null}
          <button type="button" className="btn-secondary gap-2" onClick={handleLogout}>
            <LogOut size={16} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
