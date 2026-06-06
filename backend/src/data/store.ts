/**
 * TDC Matchmaker — In-Memory Data Store
 *
 * Central data access layer for the MVP. Loads profiles and users into memory
 * at server start. All reads/writes go through this module.
 *
 * For production: replace with Firebase/PostgreSQL adapter implementing
 * the same interface.
 */

import type { Profile, User, Note, MatchResult } from '../../../shared/types';
import { generateAllProfiles } from './seed';
import { generateUsers } from './users';

class DataStore {
  private profiles: Map<string, Profile> = new Map();
  private users: Map<string, User> = new Map();
  private notes: Note[] = [];
  private sentMatches: Map<string, MatchResult[]> = new Map();
  private aiScoreCache: Map<string, { aiScore: number; label: string; explanation: string }> = new Map();
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('[DataStore] Initializing...');

    // Generate users
    const users = await generateUsers();
    const primaryMatchmaker = users[0];

    // Generate profiles and assign to primary matchmaker
    const profiles = generateAllProfiles(primaryMatchmaker.id);

    // Assign all profiles to primary matchmaker, split some to secondary
    const mm1Profiles = profiles.slice(0, 80);
    const mm2Profiles = profiles.slice(80);

    primaryMatchmaker.assignedCustomerIds = mm1Profiles.map((p) => p.id);
    if (users[1]) {
      users[1].assignedCustomerIds = mm2Profiles.map((p) => p.id);
      // Also update profile assignments
      mm2Profiles.forEach((p) => {
        p.assignedMatchmakerId = users[1].id;
      });
    }

    // Load into maps
    for (const user of users) {
      this.users.set(user.id, user);
    }
    for (const profile of profiles) {
      this.profiles.set(profile.id, profile);
    }

    this.initialized = true;
    console.log(`[DataStore] Loaded ${this.profiles.size} profiles, ${this.users.size} users`);
  }

  // ---- User operations ----

  getUserByEmail(email: string): User | undefined {
    return Array.from(this.users.values()).find((u) => u.email === email);
  }

  getUserById(id: string): User | undefined {
    return this.users.get(id);
  }

  // ---- Profile operations ----

  getCustomersForMatchmaker(matchmakerId: string): Profile[] {
    const user = this.users.get(matchmakerId);
    if (!user) return [];
    return user.assignedCustomerIds
      .map((id) => this.profiles.get(id))
      .filter((p): p is Profile => p !== undefined);
  }

  getCustomerById(id: string): Profile | undefined {
    return this.profiles.get(id);
  }

  isCustomerOwnedByMatchmaker(customerId: string, matchmakerId: string): boolean {
    const user = this.users.get(matchmakerId);
    if (!user) return false;
    return user.assignedCustomerIds.includes(customerId);
  }

  updateCustomerStatus(customerId: string, status: Profile['status']): Profile | undefined {
    const profile = this.profiles.get(customerId);
    if (!profile) return undefined;
    profile.status = status;
    return profile;
  }

  // ---- Matching pool ----

  getMatchingPool(gender: 'Male' | 'Female'): Profile[] {
    const oppositeGender = gender === 'Male' ? 'Female' : 'Male';
    return Array.from(this.profiles.values()).filter((p) => p.gender === oppositeGender);
  }

  // ---- Notes ----

  getNotesForCustomer(customerId: string): Note[] {
    return this.notes
      .filter((n) => n.customerId === customerId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  addNote(note: Note): Note {
    this.notes.push(note);
    return note;
  }

  // ---- Sent matches ----

  recordSentMatch(customerId: string, match: MatchResult): void {
    const existing = this.sentMatches.get(customerId) || [];
    const updated = { ...match, sentAt: new Date().toISOString() };
    existing.push(updated);
    this.sentMatches.set(customerId, existing);
  }

  getSentMatches(customerId: string): MatchResult[] {
    return this.sentMatches.get(customerId) || [];
  }

  isMatchAlreadySent(customerId: string, candidateId: string): boolean {
    const sent = this.sentMatches.get(customerId) || [];
    return sent.some((m) => m.candidateId === candidateId);
  }

  // ---- AI Score Cache ----

  getCachedAiScore(customerId: string, candidateId: string) {
    return this.aiScoreCache.get(`${customerId}:${candidateId}`);
  }

  setCachedAiScore(
    customerId: string,
    candidateId: string,
    data: { aiScore: number; label: string; explanation: string }
  ): void {
    this.aiScoreCache.set(`${customerId}:${candidateId}`, data);
  }

  // ---- Stats ----

  getStats() {
    return {
      totalProfiles: this.profiles.size,
      totalUsers: this.users.size,
      totalNotes: this.notes.length,
      totalSentMatches: Array.from(this.sentMatches.values()).reduce((sum, arr) => sum + arr.length, 0),
      cacheSize: this.aiScoreCache.size,
    };
  }
}

// Singleton instance
export const dataStore = new DataStore();
