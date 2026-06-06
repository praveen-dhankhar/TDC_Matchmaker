'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/layout/AppHeader';
import { CustomerList } from '@/components/dashboard/CustomerList';
import { StateMessage } from '@/components/ui/StateMessage';
import { api } from '@/lib/api';
import type { CustomerSummary, SessionUser } from '@/lib/types';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadDashboard() {
      try {
        const [session, customerResponse] = await Promise.all([api.me(), api.customers()]);
        if (!mounted) return;
        setUser(session.user);
        setCustomers(customerResponse.customers);
      } catch (err) {
        if (!mounted) return;
        if (err instanceof Error && err.message.toLowerCase().includes('auth')) {
          router.replace('/login');
          return;
        }
        setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadDashboard();
    return () => {
      mounted = false;
    };
  }, [router]);

  const statusCounts = useMemo(() => {
    return customers.reduce<Record<string, number>>((acc, customer) => {
      acc[customer.status] = (acc[customer.status] || 0) + 1;
      return acc;
    }, {});
  }, [customers]);

  return (
    <main className="min-h-screen">
      <AppHeader user={user} />
      <div className="app-container py-8">
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="field-label">Dashboard</p>
            <h1 className="mt-1 text-2xl font-semibold text-ink">Assigned Customers</h1>
            <p className="mt-2 text-sm text-muted">
              Review biodata, update journey status, compare AI-ranked matches, and send introductions.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {['New Lead', 'In Progress', 'Matched', 'On Hold', 'Closed'].map((status) => (
              <div key={status} className="rounded-lg border border-black/10 bg-white px-3 py-2 text-center shadow-sm">
                <p className="text-lg font-semibold text-ink">{statusCounts[status] || 0}</p>
                <p className="text-xs text-muted">{status}</p>
              </div>
            ))}
          </div>
        </div>

        {loading ? <StateMessage title="Loading customers..." /> : null}
        {error ? <StateMessage title="Unable to load dashboard" body={error} /> : null}
        {!loading && !error ? <CustomerList customers={customers} /> : null}
      </div>
    </main>
  );
}
