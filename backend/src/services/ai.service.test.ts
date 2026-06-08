import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { config } from '../config';
import { dataStore } from '../data/store';
import { calculateFinalScore } from './matching.service';
import {
  generateFallbackMatchInsight,
  parseAiMatchResponse,
  sanitizeProfileForAI,
  scoreWithAI,
} from './ai.service';
import type { Profile } from '../../../shared/types';

const mutableGeminiConfig = config.gemini as unknown as { apiKey: string };
let originalApiKey = '';

function getProfilePair(): { customer: Profile; candidate: Profile } {
  const customer = dataStore.getCustomersForMatchmaker('mm-001')[0];
  if (!customer) throw new Error('Test customer not found');

  const candidate = dataStore.getMatchingPool(customer.gender)[0];
  if (!candidate) throw new Error('Test candidate not found');

  return { customer, candidate };
}

function mockGeminiText(text: string) {
  return vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      candidates: [
        {
          content: {
            parts: [{ text }],
          },
        },
      ],
    }),
  }));
}

describe('AI match scoring enhancements', () => {
  beforeAll(async () => {
    originalApiKey = mutableGeminiConfig.apiKey;
    await dataStore.initialize();
  });

  beforeEach(() => {
    dataStore.clearAiCaches();
    mutableGeminiConfig.apiKey = 'test-gemini-key';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    mutableGeminiConfig.apiKey = originalApiKey;
  });

  it('parses the enriched AI match response shape', () => {
    const { customer, candidate } = getProfilePair();
    const fallback = generateFallbackMatchInsight(customer, candidate, 72);

    const result = parseAiMatchResponse(
      JSON.stringify({
        aiScore: 88,
        label: 'High Potential',
        explanation: 'Strong fit across city and lifestyle preferences.',
        strengths: ['Same city', 'Shared hobbies'],
        concerns: ['Relocation preference should be confirmed'],
        reasoning: 'The supplied profiles show clear preference overlap without relying on missing details.',
        suggestedNextStep: 'Review the match with the customer and confirm mutual interest.',
      }),
      fallback
    );

    expect(result).toEqual({
      aiScore: 88,
      label: 'High Potential',
      explanation: 'Strong fit across city and lifestyle preferences.',
      strengths: ['Same city', 'Shared hobbies'],
      concerns: ['Relocation preference should be confirmed'],
      reasoning: 'The supplied profiles show clear preference overlap without relying on missing details.',
      suggestedNextStep: 'Review the match with the customer and confirm mutual interest.',
    });
  });

  it('falls back to deterministic scoring when Gemini returns invalid JSON', async () => {
    const { customer, candidate } = getProfilePair();
    const fetchMock = mockGeminiText('not valid json');
    vi.stubGlobal('fetch', fetchMock);

    const result = await scoreWithAI(customer.id, candidate.id, 64);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.aiScore).toBe(64);
    expect(result.label).toBe('Good Match');
    expect(result.aiUnavailable).toBe(true);
    expect(result.reasoning).toContain('rule engine');
  });

  it('falls back without calling Gemini when the API key is missing', async () => {
    const { customer, candidate } = getProfilePair();
    const fetchMock = vi.fn();
    mutableGeminiConfig.apiKey = '';
    vi.stubGlobal('fetch', fetchMock);

    const result = await scoreWithAI(customer.id, candidate.id, 71);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.aiScore).toBe(71);
    expect(result.aiUnavailable).toBe(true);
  });

  it('sanitizes profiles before AI use and removes contact PII from allowed text fields', () => {
    const { customer } = getProfilePair();
    const profileWithPii: Profile = {
      ...customer,
      email: 'private@example.com',
      phoneNumber: '+919876543210',
      income: '99-100 LPA',
      currentCompany: 'Secret Company',
      bio: 'Please call +919876543210 or email private@example.com after reviewing.',
      dealbreakers: ['No phone +919999999999 in prompt'],
    };

    const sanitized = sanitizeProfileForAI(profileWithPii);
    const serialized = JSON.stringify(sanitized);

    expect(Object.keys(sanitized)).not.toContain('email');
    expect(Object.keys(sanitized)).not.toContain('phoneNumber');
    expect(Object.keys(sanitized)).not.toContain('income');
    expect(Object.keys(sanitized)).not.toContain('currentCompany');
    expect(Object.keys(sanitized)).not.toContain('lastName');
    expect(serialized).not.toContain('private@example.com');
    expect(serialized).not.toContain('+919876543210');
    expect(serialized).not.toContain('99-100 LPA');
    expect(serialized).not.toContain('Secret Company');
    expect(sanitized.age).toEqual(expect.any(Number));
  });

  it('calculates the weighted final score from rule and AI scores', () => {
    expect(calculateFinalScore(80, 90)).toBe(86);
    expect(calculateFinalScore(200, -20)).toBe(40);
  });
});
