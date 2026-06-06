import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function fullName(person: { firstName: string; lastName: string }) {
  return `${person.firstName} ${person.lastName}`;
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export function computeAge(dateOfBirth: string) {
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }
  return age;
}

export function statusTone(status: string) {
  switch (status) {
    case 'New Lead':
      return 'bg-rose text-blush border-blush/20';
    case 'In Progress':
      return 'bg-mint text-sage border-sage/20';
    case 'Matched':
      return 'bg-[#e6f4ea] text-[#276749] border-[#276749]/20';
    case 'On Hold':
      return 'bg-[#eef0f3] text-[#565f69] border-[#565f69]/20';
    case 'Closed':
      return 'bg-[#f1eded] text-[#6f4f55] border-[#6f4f55]/20';
    default:
      return 'bg-white text-muted border-black/10';
  }
}

export function labelTone(label: string) {
  switch (label) {
    case 'High Potential':
      return 'bg-[#e6f4ea] text-[#276749] border-[#276749]/20';
    case 'Good Match':
      return 'bg-mint text-sage border-sage/20';
    case 'Worth Exploring':
      return 'bg-rose text-blush border-blush/20';
    default:
      return 'bg-[#f1eded] text-[#6f4f55] border-[#6f4f55]/20';
  }
}

export function getInitials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}
