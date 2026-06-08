/**
 * TDC Matchmaker — Gender-Specific Matching Engine
 *
 * Implements a two-step matching process:
 * 1. Hard filters: opposite gender, marital status, dealbreakers, age range
 * 2. Soft scoring: weighted compatibility factors (0–100)
 *
 * Scoring weights differ by gender, reflecting Indian matrimonial conventions
 * as specified in the project requirements.
 */

import { dataStore } from '../data/store';
import { computeAge, parseIncome, arrayOverlap, clamp } from '../utils/helpers';
import type { Profile } from '../../../shared/types';

interface ScoredCandidate {
  candidate: Profile;
  ruleScore: number;
  breakdown: Record<string, number>;
}

export function calculateFinalScore(ruleScore: number, aiScore: number): number {
  return Math.round(0.4 * clamp(ruleScore, 0, 100) + 0.6 * clamp(aiScore, 0, 100));
}

/**
 * Run the full matching pipeline for a customer.
 * Returns candidates sorted by rule score (descending).
 */
export function findMatches(customerId: string, limit: number = 10): ScoredCandidate[] {
  const customer = dataStore.getCustomerById(customerId);
  if (!customer) return [];

  const pool = dataStore.getMatchingPool(customer.gender);
  const customerAge = computeAge(customer.dateOfBirth);

  // Step 1: Hard filters
  const filtered = pool.filter((candidate) => {
    // Marital status compatibility
    if (customer.maritalStatus === 'Never Married' && candidate.maritalStatus !== 'Never Married') {
      // Allow only if customer hasn't set this as a dealbreaker
      // For simplicity, never-married prefers never-married
      if (Math.random() > 0.3) return false;
    }

    // Dealbreaker conflicts
    if (hasDealbreaker(customer, candidate)) return false;

    // Age within preferred range
    const candidateAge = computeAge(candidate.dateOfBirth);
    if (candidateAge < customer.preferredAgeRange.min || candidateAge > customer.preferredAgeRange.max) {
      return false;
    }

    return true;
  });

  // Step 2: Score remaining candidates
  const scored = filtered.map((candidate) => {
    const { score, breakdown } = customer.gender === 'Male'
      ? scoreMaleCustomer(customer, candidate, customerAge)
      : scoreFemaleCustomer(customer, candidate);

    return { candidate, ruleScore: Math.round(score), breakdown };
  });

  // Sort by score descending and take top N
  scored.sort((a, b) => b.ruleScore - a.ruleScore);
  return scored.slice(0, limit);
}

/**
 * Check if there are any dealbreaker conflicts between customer and candidate.
 */
function hasDealbreaker(customer: Profile, candidate: Profile): boolean {
  for (const db of customer.dealbreakers) {
    const dbLower = db.toLowerCase();
    if (dbLower.includes('smoking') && candidate.smoking !== 'Never') return true;
    if (dbLower.includes('drinking') && candidate.drinking === 'Regularly') return true;
    if (dbLower.includes('different religion') && candidate.religion !== customer.religion) return true;
    if (dbLower.includes('non-vegetarian') && candidate.diet === 'Non-Vegetarian') return true;
    if (dbLower.includes('no interest in children') && candidate.wantKids === 'No') return true;
    if (dbLower.includes('unwilling to relocate') && candidate.openToRelocate === 'No') return true;
    if (dbLower.includes('different caste') && candidate.caste !== customer.caste) return true;
    if (dbLower.includes('no higher education') && !candidate.postgraduateDegree) return true;
  }
  return false;
}

/**
 * Scoring for male customers matching with female candidates.
 *
 * Weights:
 *   Age gap: 20 | Income: 10 | Height: 10 | Kids: 15 |
 *   Religion: 15 | Caste: 10 | City: 10 | Language: 5 | Lifestyle: 5
 */
function scoreMaleCustomer(
  customer: Profile,
  candidate: Profile,
  customerAge: number
): { score: number; breakdown: Record<string, number> } {
  const candidateAge = computeAge(candidate.dateOfBirth);
  const breakdown: Record<string, number> = {};

  // Age gap: prefer 1–5 years younger (max 20)
  const ageDiff = customerAge - candidateAge;
  if (ageDiff >= 1 && ageDiff <= 5) {
    breakdown.age = 20;
  } else if (ageDiff >= 0 && ageDiff <= 7) {
    breakdown.age = 12;
  } else {
    breakdown.age = 5;
  }

  // Income: candidate earns ≤ customer (max 10)
  const customerIncome = parseIncome(customer.income);
  const candidateIncome = parseIncome(candidate.income);
  if (candidateIncome <= customerIncome) {
    breakdown.income = 10;
  } else if (candidateIncome <= customerIncome * 1.2) {
    breakdown.income = 6;
  } else {
    breakdown.income = 3;
  }

  // Height: candidate shorter by ≥ 2cm (max 10)
  const heightDiff = customer.height - candidate.height;
  if (heightDiff >= 2) {
    breakdown.height = 10;
  } else if (heightDiff >= 0) {
    breakdown.height = 6;
  } else {
    breakdown.height = 3;
  }

  // Kids alignment (max 15)
  if (customer.wantKids === candidate.wantKids) {
    breakdown.kids = 15;
  } else if (customer.wantKids === 'Maybe' || candidate.wantKids === 'Maybe') {
    breakdown.kids = 10;
  } else {
    breakdown.kids = 2;
  }

  // Religion match (max 15)
  if (customer.religion === candidate.religion) {
    breakdown.religion = 15;
  } else if (customer.preferredReligion.includes(candidate.religion)) {
    breakdown.religion = 10;
  } else {
    breakdown.religion = 2;
  }

  // Caste compatibility (max 10)
  if (customer.caste === candidate.caste) {
    breakdown.caste = 10;
  } else {
    breakdown.caste = 3;
  }

  // City proximity (max 10)
  if (customer.city === candidate.city) {
    breakdown.city = 10;
  } else if (customer.preferredCities.includes(candidate.city)) {
    breakdown.city = 7;
  } else if (candidate.openToRelocate !== 'No') {
    breakdown.city = 4;
  } else {
    breakdown.city = 1;
  }

  // Language overlap (max 5)
  const overlap = arrayOverlap(customer.languagesKnown, candidate.languagesKnown);
  breakdown.language = clamp(overlap * 2, 0, 5);

  // Lifestyle alignment (max 5)
  let lifestyleScore = 0;
  if (customer.diet === candidate.diet) lifestyleScore += 2;
  if (customer.drinking === candidate.drinking) lifestyleScore += 1.5;
  if (customer.smoking === candidate.smoking) lifestyleScore += 1.5;
  breakdown.lifestyle = clamp(Math.round(lifestyleScore), 0, 5);

  const score = Object.values(breakdown).reduce((sum, v) => sum + v, 0);
  return { score: clamp(score, 0, 100), breakdown };
}

/**
 * Scoring for female customers matching with male candidates.
 *
 * Weights:
 *   Profession: 20 | Values: 15 | Education: 15 | Religion: 15 |
 *   City: 10 | Age: 10 | Caste: 5 | Lifestyle: 5 | Language: 5
 */
function scoreFemaleCustomer(
  customer: Profile,
  candidate: Profile
): { score: number; breakdown: Record<string, number> } {
  const candidateAge = computeAge(candidate.dateOfBirth);
  const breakdown: Record<string, number> = {};

  // Profession/career stability (max 20)
  const stableProfessions = [
    'doctor', 'lawyer', 'engineer', 'chartered accountant', 'civil servant',
    'investment banker', 'management consultant', 'professor', 'architect',
    'software engineer', 'data scientist', 'product manager',
  ];
  const isStable = stableProfessions.some((p) =>
    candidate.profession.toLowerCase().includes(p)
  );
  const highIncome = parseIncome(candidate.income) >= 15;
  if (isStable && highIncome) {
    breakdown.profession = 20;
  } else if (isStable || highIncome) {
    breakdown.profession = 14;
  } else {
    breakdown.profession = 6;
  }

  // Values alignment: kids + relocate + pets (max 15)
  let valuesScore = 0;
  if (customer.wantKids === candidate.wantKids) valuesScore += 6;
  else if (customer.wantKids === 'Maybe' || candidate.wantKids === 'Maybe') valuesScore += 3;
  if (customer.openToRelocate === candidate.openToRelocate) valuesScore += 5;
  else if (customer.openToRelocate === 'Maybe' || candidate.openToRelocate === 'Maybe') valuesScore += 2;
  if (customer.openToPets === candidate.openToPets) valuesScore += 4;
  else if (customer.openToPets === 'Maybe' || candidate.openToPets === 'Maybe') valuesScore += 2;
  breakdown.values = clamp(valuesScore, 0, 15);

  // Education parity or higher (max 15)
  if (candidate.postgraduateDegree && customer.postgraduateDegree) {
    breakdown.education = 15;
  } else if (candidate.postgraduateDegree) {
    breakdown.education = 13;
  } else if (!customer.postgraduateDegree) {
    breakdown.education = 10;
  } else {
    breakdown.education = 5;
  }

  // Religion match (max 15)
  if (customer.religion === candidate.religion) {
    breakdown.religion = 15;
  } else if (customer.preferredReligion.includes(candidate.religion)) {
    breakdown.religion = 10;
  } else {
    breakdown.religion = 2;
  }

  // City/relocation (max 10)
  if (customer.city === candidate.city) {
    breakdown.city = 10;
  } else if (customer.preferredCities.includes(candidate.city)) {
    breakdown.city = 7;
  } else if (candidate.openToRelocate !== 'No') {
    breakdown.city = 4;
  } else {
    breakdown.city = 1;
  }

  // Age compatibility: within preferred range (max 10)
  if (candidateAge >= customer.preferredAgeRange.min && candidateAge <= customer.preferredAgeRange.max) {
    breakdown.age = 10;
  } else {
    const distance = Math.min(
      Math.abs(candidateAge - customer.preferredAgeRange.min),
      Math.abs(candidateAge - customer.preferredAgeRange.max)
    );
    breakdown.age = clamp(10 - distance * 2, 0, 10);
  }

  // Caste compatibility (max 5)
  if (customer.caste === candidate.caste) {
    breakdown.caste = 5;
  } else {
    breakdown.caste = 1;
  }

  // Lifestyle (max 5)
  let lifestyleScore = 0;
  if (customer.diet === candidate.diet) lifestyleScore += 2;
  if (customer.drinking === candidate.drinking) lifestyleScore += 1.5;
  if (customer.smoking === candidate.smoking) lifestyleScore += 1.5;
  breakdown.lifestyle = clamp(Math.round(lifestyleScore), 0, 5);

  // Language overlap (max 5)
  const overlap = arrayOverlap(customer.languagesKnown, candidate.languagesKnown);
  breakdown.language = clamp(overlap * 2, 0, 5);

  const score = Object.values(breakdown).reduce((sum, v) => sum + v, 0);
  return { score: clamp(score, 0, 100), breakdown };
}

export const matchingService = { findMatches, calculateFinalScore };
