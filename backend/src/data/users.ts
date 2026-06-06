import bcryptjs from 'bcryptjs';
import type { User } from '../../../shared/types';

/**
 * Generate demo matchmaker users with bcrypt-hashed passwords.
 * Called at server start to initialize the user store.
 */
export async function generateUsers(): Promise<User[]> {
  const passwordHash = await bcryptjs.hash('TDC2024!', 12);

  return [
    {
      id: 'mm-001',
      email: 'matchmaker@thedatecrew.com',
      passwordHash,
      name: 'Priya Sharma',
      assignedCustomerIds: [], // Populated after profile generation
    },
    {
      id: 'mm-002',
      email: 'senior@thedatecrew.com',
      passwordHash,
      name: 'Rahul Kapoor',
      assignedCustomerIds: [],
    },
  ];
}
