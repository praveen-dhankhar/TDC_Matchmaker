'use client';

import type { ReactNode } from 'react';
import { CalendarDays, MapPin, ShieldCheck } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { computeAge, formatDate, fullName } from '@/lib/utils';
import type { CustomerStatus, Profile } from '@/lib/types';

const STATUSES: CustomerStatus[] = ['New Lead', 'In Progress', 'Matched', 'On Hold', 'Closed'];

type BiodataViewProps = {
  customer: Profile;
  onStatusChange: (status: CustomerStatus) => Promise<void>;
  statusSaving: boolean;
};

type Field = {
  label: string;
  value: ReactNode;
};

function formatList(items: string[]) {
  return items.length > 0 ? items.join(', ') : 'None listed';
}

function DetailSection({ title, fields }: { title: string; fields: Field[] }) {
  return (
    <section className="border-t border-black/10 px-5 py-5 first:border-t-0">
      <h2 className="mb-4 text-base font-semibold text-ink">{title}</h2>
      <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
        {fields.map((field) => (
          <div key={field.label}>
            <dt className="field-label">{field.label}</dt>
            <dd className="mt-1 text-sm leading-6 text-ink">{field.value || 'Not specified'}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function BiodataView({ customer, onStatusChange, statusSaving }: BiodataViewProps) {
  const age = computeAge(customer.dateOfBirth);

  return (
    <div className="panel overflow-hidden">
      <section className="grid gap-5 px-5 py-6 lg:grid-cols-[1fr_260px] lg:items-start">
        <div className="flex flex-col gap-4 sm:flex-row">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={customer.profilePhotoUrl}
            alt={`${fullName(customer)} profile`}
            className="h-28 w-28 rounded-lg border border-black/10 bg-white object-cover"
          />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold text-ink">{fullName(customer)}</h1>
              <StatusBadge value={customer.status} />
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{customer.bio}</p>
            <div className="mt-4 flex flex-wrap gap-3 text-sm text-muted">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays size={16} /> {age} years
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={16} /> {customer.city}, {customer.country}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck size={16} /> Verified {formatDate(customer.verifiedAt)}
              </span>
            </div>
          </div>
        </div>

        <label className="block">
          <span className="field-label">Journey Status</span>
          <select
            className="input mt-2"
            value={customer.status}
            disabled={statusSaving}
            onChange={(event) => onStatusChange(event.target.value as CustomerStatus)}
          >
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
      </section>

      <DetailSection
        title="Personal and Contact"
        fields={[
          { label: 'First Name', value: customer.firstName },
          { label: 'Last Name', value: customer.lastName },
          { label: 'Gender', value: customer.gender },
          { label: 'Date of Birth', value: formatDate(customer.dateOfBirth) },
          { label: 'Age', value: `${age} years` },
          { label: 'Email', value: customer.email },
          { label: 'Phone', value: customer.phoneNumber },
          { label: 'Physical Disability', value: customer.physicalDisability || 'None' },
        ]}
      />

      <DetailSection
        title="Location and Physical"
        fields={[
          { label: 'Country', value: customer.country },
          { label: 'City', value: customer.city },
          { label: 'Open to Relocate', value: customer.openToRelocate },
          { label: 'Height', value: `${customer.height} cm` },
          { label: 'Body Type', value: customer.bodyType },
        ]}
      />

      <DetailSection
        title="Education and Career"
        fields={[
          { label: 'Undergraduate College', value: customer.undergraduateCollege },
          { label: 'Degree', value: customer.degree },
          { label: 'Postgraduate Degree', value: customer.postgraduateDegree },
          { label: 'Income', value: customer.income },
          { label: 'Current Company', value: customer.currentCompany },
          { label: 'Designation', value: customer.designation },
          { label: 'Profession', value: customer.profession },
        ]}
      />

      <DetailSection
        title="Family and Cultural"
        fields={[
          { label: 'Marital Status', value: customer.maritalStatus },
          { label: 'Siblings', value: customer.siblings },
          { label: 'Father Occupation', value: customer.fatherOccupation },
          { label: 'Mother Occupation', value: customer.motherOccupation },
          { label: 'Family Type', value: customer.familyType },
          { label: 'Religion', value: customer.religion },
          { label: 'Caste', value: customer.caste },
          { label: 'Sub Caste', value: customer.subCaste },
          { label: 'Mother Tongue', value: customer.motherTongue },
          { label: 'Languages Known', value: formatList(customer.languagesKnown) },
        ]}
      />

      <DetailSection
        title="Lifestyle"
        fields={[
          { label: 'Want Kids', value: customer.wantKids },
          { label: 'Open to Pets', value: customer.openToPets },
          { label: 'Diet', value: customer.diet },
          { label: 'Drinking', value: customer.drinking },
          { label: 'Smoking', value: customer.smoking },
          { label: 'Hobbies', value: formatList(customer.hobbies) },
        ]}
      />

      <DetailSection
        title="Preferences"
        fields={[
          {
            label: 'Preferred Age Range',
            value: `${customer.preferredAgeRange.min}-${customer.preferredAgeRange.max} years`,
          },
          { label: 'Preferred Cities', value: formatList(customer.preferredCities) },
          { label: 'Preferred Religion', value: formatList(customer.preferredReligion) },
          { label: 'Dealbreakers', value: formatList(customer.dealbreakers) },
        ]}
      />
    </div>
  );
}
