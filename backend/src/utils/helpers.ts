/**
 * Compute age from an ISO date-of-birth string.
 */
export function computeAge(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

/**
 * Parse an income range string like "10-15 LPA" into a numeric midpoint.
 * Returns the average of min and max in lakhs.
 */
export function parseIncome(income: string): number {
  const match = income.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/);
  if (!match) return 0;
  return (parseFloat(match[1]) + parseFloat(match[2])) / 2;
}

/**
 * Compute overlap count between two string arrays (case-insensitive).
 */
export function arrayOverlap(a: string[], b: string[]): number {
  const setA = new Set(a.map((s) => s.toLowerCase()));
  return b.filter((s) => setA.has(s.toLowerCase())).length;
}

/**
 * Generate a random integer between min and max (inclusive).
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Pick a random element from an array.
 */
export function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Shuffle an array in place (Fisher-Yates).
 */
export function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Clamp a number between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Format a date string to a human-readable format.
 */
export function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
