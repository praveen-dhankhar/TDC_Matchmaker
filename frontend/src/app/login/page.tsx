'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { HeartHandshake } from 'lucide-react';
import { api } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('matchmaker@thedatecrew.com');
  const [password, setPassword] = useState('TDC2024!');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    api
      .me()
      .then(() => {
        if (mounted) router.replace('/dashboard');
      })
      .catch(() => {
        if (mounted) setCheckingSession(false);
      });
    return () => {
      mounted = false;
    };
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.login(email, password);
      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <p className="text-sm text-muted">Checking session...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <section className="panel w-full max-w-md overflow-hidden">
        <div className="border-b border-black/10 px-6 py-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-blush text-white">
              <HeartHandshake size={22} />
            </span>
            <div>
              <h1 className="text-xl font-semibold text-ink">TDC Matchmaker</h1>
              <p className="text-sm text-muted">Sign in to manage assigned customers.</p>
            </div>
          </div>
        </div>

        <form className="space-y-4 px-6 py-6" onSubmit={handleSubmit}>
          <label className="block">
            <span className="field-label">Email</span>
            <input
              className="input mt-2"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
              required
            />
          </label>

          <label className="block">
            <span className="field-label">Password</span>
            <input
              className="input mt-2"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>

          {error ? <p className="rounded-md bg-rose px-3 py-2 text-sm text-blush">{error}</p> : null}

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <p className="text-xs leading-5 text-muted">
            Demo credentials: matchmaker@thedatecrew.com / TDC2024!
          </p>
        </form>
      </section>
    </main>
  );
}
