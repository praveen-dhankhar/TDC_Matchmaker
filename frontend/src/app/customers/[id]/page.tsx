'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { BiodataView } from '@/components/customer/BiodataView';
import { NotesPanel } from '@/components/customer/NotesPanel';
import { AppHeader } from '@/components/layout/AppHeader';
import { MatchesPanel } from '@/components/matching/MatchesPanel';
import { StateMessage } from '@/components/ui/StateMessage';
import { Toast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import type { CustomerStatus, Profile, SessionUser } from '@/lib/types';

export default function CustomerDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const customerId = params.id;
  const [user, setUser] = useState<SessionUser | null>(null);
  const [customer, setCustomer] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusSaving, setStatusSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadCustomer() {
      try {
        const [session, customerResponse] = await Promise.all([api.me(), api.customer(customerId)]);
        if (!mounted) return;
        setUser(session.user);
        setCustomer(customerResponse.customer);
      } catch (err) {
        if (!mounted) return;
        const message = err instanceof Error ? err.message : 'Failed to load customer';
        if (message.toLowerCase().includes('auth')) {
          router.replace('/login');
          return;
        }
        setError(message);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadCustomer();
    return () => {
      mounted = false;
    };
  }, [customerId, router]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function handleStatusChange(status: CustomerStatus) {
    if (!customer || customer.status === status) return;
    setStatusSaving(true);
    setError(null);
    try {
      const { customer: updatedCustomer } = await api.updateStatus(customer.id, status);
      setCustomer(updatedCustomer);
      setToast(`Status updated to ${status}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setStatusSaving(false);
    }
  }

  return (
    <main className="min-h-screen">
      <AppHeader user={user} />
      <div className="app-container py-8">
        <Link href="/dashboard" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-blush">
          <ArrowLeft size={16} />
          Back to dashboard
        </Link>

        {loading ? <StateMessage title="Loading biodata..." /> : null}
        {error ? <StateMessage title="Unable to load customer" body={error} /> : null}

        {!loading && !error && customer ? (
          <div className="space-y-6">
            <BiodataView
              customer={customer}
              onStatusChange={handleStatusChange}
              statusSaving={statusSaving}
            />
            <MatchesPanel customerId={customer.id} />
            <NotesPanel customerId={customer.id} />
          </div>
        ) : null}
      </div>
      <Toast message={toast} />
    </main>
  );
}
