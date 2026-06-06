'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowUpDown, Search } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { fullName } from '@/lib/utils';
import type { CustomerStatus, CustomerSummary } from '@/lib/types';

const STATUSES: Array<CustomerStatus | 'All'> = [
  'All',
  'New Lead',
  'In Progress',
  'Matched',
  'On Hold',
  'Closed',
];

type SortKey = 'name' | 'age' | 'status';

type CustomerListProps = {
  customers: CustomerSummary[];
};

export function CustomerList({ customers }: CustomerListProps) {
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('All');
  const [status, setStatus] = useState<CustomerStatus | 'All'>('All');
  const [sortKey, setSortKey] = useState<SortKey>('name');

  const cities = useMemo(() => {
    return ['All', ...Array.from(new Set(customers.map((customer) => customer.city))).sort()];
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return customers
      .filter((customer) => {
        const nameMatches = fullName(customer).toLowerCase().includes(normalizedQuery);
        const cityMatches = city === 'All' || customer.city === city;
        const statusMatches = status === 'All' || customer.status === status;
        return nameMatches && cityMatches && statusMatches;
      })
      .sort((a, b) => {
        if (sortKey === 'age') return a.age - b.age;
        if (sortKey === 'status') return a.status.localeCompare(b.status);
        return fullName(a).localeCompare(fullName(b));
      });
  }, [city, customers, query, sortKey, status]);

  return (
    <section className="panel overflow-hidden">
      <div className="border-b border-black/10 px-4 py-4 sm:px-5">
        <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_180px_180px_180px]">
          <label className="relative">
            <span className="sr-only">Search by name</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
            <input
              className="input pl-9"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name"
            />
          </label>

          <label>
            <span className="sr-only">Filter by city</span>
            <select className="input" value={city} onChange={(event) => setCity(event.target.value)}>
              {cities.map((item) => (
                <option key={item} value={item}>
                  {item === 'All' ? 'All cities' : item}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="sr-only">Filter by status</span>
            <select
              className="input"
              value={status}
              onChange={(event) => setStatus(event.target.value as CustomerStatus | 'All')}
            >
              {STATUSES.map((item) => (
                <option key={item} value={item}>
                  {item === 'All' ? 'All statuses' : item}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="sr-only">Sort customers</span>
            <select
              className="input"
              value={sortKey}
              onChange={(event) => setSortKey(event.target.value as SortKey)}
            >
              <option value="name">Sort by name</option>
              <option value="age">Sort by age</option>
              <option value="status">Sort by status</option>
            </select>
          </label>
        </div>
      </div>

      <div className="hidden grid-cols-[1.4fr_0.5fr_0.9fr_1fr_0.9fr] gap-4 border-b border-black/10 bg-shell px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted md:grid">
        <span className="flex items-center gap-1">
          Name <ArrowUpDown size={12} />
        </span>
        <span>Age</span>
        <span>City</span>
        <span>Marital Status</span>
        <span>Status</span>
      </div>

      {filteredCustomers.length === 0 ? (
        <div className="px-5 py-12 text-center">
          <p className="text-base font-semibold text-ink">No customers assigned</p>
          <p className="mt-2 text-sm text-muted">Adjust filters or check the assigned profile pool.</p>
        </div>
      ) : (
        <div className="divide-y divide-black/10">
          {filteredCustomers.map((customer) => (
            <Link
              href={`/customers/${customer.id}`}
              key={customer.id}
              className="grid gap-3 px-4 py-4 transition hover:bg-rose/20 sm:px-5 md:grid-cols-[1.4fr_0.5fr_0.9fr_1fr_0.9fr] md:items-center md:gap-4"
            >
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={customer.profilePhotoUrl}
                  alt=""
                  className="h-11 w-11 rounded-full border border-black/10 bg-white"
                />
                <div>
                  <p className="font-semibold text-ink">{fullName(customer)}</p>
                  <p className="text-xs text-muted md:hidden">
                    {customer.age} years · {customer.city}
                  </p>
                </div>
              </div>
              <span className="hidden text-sm text-ink md:block">{customer.age}</span>
              <span className="hidden text-sm text-ink md:block">{customer.city}</span>
              <span className="text-sm text-muted md:text-ink">{customer.maritalStatus}</span>
              <StatusBadge value={customer.status} className="w-fit" />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
