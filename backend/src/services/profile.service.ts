import { dataStore } from '../data/store';
import { decrypt, isEncrypted } from '../utils/encryption';
import { computeAge } from '../utils/helpers';
import type { Profile, CustomerSummary, CustomerStatus } from '../../../shared/types';

export class ProfileService {
  /**
   * Get all customers assigned to a matchmaker as summary cards.
   */
  getCustomersList(matchmakerId: string): CustomerSummary[] {
    const profiles = dataStore.getCustomersForMatchmaker(matchmakerId);
    return profiles.map((p) => ({
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      gender: p.gender,
      age: computeAge(p.dateOfBirth),
      city: p.city,
      maritalStatus: p.maritalStatus,
      status: p.status,
      profilePhotoUrl: p.profilePhotoUrl,
    }));
  }

  /**
   * Get full customer profile by ID, decrypting PII fields.
   * Returns null if not found or not owned by the matchmaker.
   */
  getCustomerDetail(customerId: string, matchmakerId: string): Profile | null {
    if (!dataStore.isCustomerOwnedByMatchmaker(customerId, matchmakerId)) {
      return null;
    }

    const profile = dataStore.getCustomerById(customerId);
    if (!profile) return null;

    // Decrypt PII fields for the response
    return {
      ...profile,
      email: isEncrypted(profile.email) ? decrypt(profile.email) : profile.email,
      phoneNumber: isEncrypted(profile.phoneNumber) ? decrypt(profile.phoneNumber) : profile.phoneNumber,
    };
  }

  /**
   * Update customer status tag.
   */
  updateStatus(customerId: string, matchmakerId: string, status: CustomerStatus): Profile | null {
    if (!dataStore.isCustomerOwnedByMatchmaker(customerId, matchmakerId)) {
      return null;
    }
    return dataStore.updateCustomerStatus(customerId, status) || null;
  }
}

export const profileService = new ProfileService();
