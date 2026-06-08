import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { config } from '../config';
import { dataStore } from '../data/store';
import {
  generateEmailIntro,
  getEmailIntroForMatch,
} from './emailIntroAi.service';
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

function mockGeminiIntro(subject: string, intro: string) {
  return vi.fn(async (_url: unknown, _options: { body?: string }) => ({
    ok: true,
    status: 200,
    json: async () => ({
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({ subject, intro }),
              },
            ],
          },
        },
      ],
    }),
  }));
}

describe('email intro AI service', () => {
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

  it('generates a short personalized email intro from Gemini JSON', async () => {
    const { customer, candidate } = getProfilePair();
    const fetchMock = mockGeminiIntro(
      `Meet ${candidate.firstName}`,
      `${candidate.firstName} is based in ${candidate.city} and works as a ${candidate.profession}. The profiles show overlap in lifestyle, interests, and stated preferences, making this worth a thoughtful review.`
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await generateEmailIntro({
      customerProfile: customer,
      candidateProfile: {
        ...candidate,
        email: 'candidate@example.com',
        phoneNumber: '+919876543210',
        income: '50-75 LPA',
        bio: 'Contact candidate@example.com or +919876543210.',
      },
      matchExplanation: 'Good overlap. Do not include private@example.com in the prompt.',
      strengths: ['Shared language preference', 'Similar lifestyle'],
    });

    expect(result.subject).toBe(`Meet ${candidate.firstName}`);
    expect(result.intro.split(/\s+/).length).toBeLessThanOrEqual(120);
    expect(result.aiUnavailable).toBeUndefined();

    const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    const prompt = requestBody.contents[0].parts[0].text as string;
    expect(prompt).not.toContain('candidate@example.com');
    expect(prompt).not.toContain('private@example.com');
    expect(prompt).not.toContain('+919876543210');
    expect(prompt).not.toContain('50-75 LPA');
  });

  it('returns a cached email intro without calling Gemini', async () => {
    const { customer, candidate } = getProfilePair();
    const fetchMock = vi.fn();
    dataStore.setCachedEmailIntro(customer.id, candidate.id, {
      subject: 'Cached subject',
      intro: 'Cached intro.',
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await getEmailIntroForMatch(customer.id, candidate.id, {
      customerProfile: customer,
      candidateProfile: candidate,
      matchExplanation: 'Cached explanation',
      strengths: ['Cached strength'],
    });

    expect(result).toEqual({
      subject: 'Cached subject',
      intro: 'Cached intro.',
      cached: true,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('generates and stores an email intro on cache miss', async () => {
    const { customer, candidate } = getProfilePair();
    const fetchMock = mockGeminiIntro('Fresh subject', 'Fresh intro with supplied compatibility highlights.');
    vi.stubGlobal('fetch', fetchMock);

    const result = await getEmailIntroForMatch(customer.id, candidate.id, {
      customerProfile: customer,
      candidateProfile: candidate,
      matchExplanation: 'Fresh explanation',
      strengths: ['Fresh strength'],
    });
    const cached = dataStore.getCachedEmailIntro(customer.id, candidate.id);

    expect(result).toEqual({
      subject: 'Fresh subject',
      intro: 'Fresh intro with supplied compatibility highlights.',
      cached: false,
    });
    expect(cached).toEqual({
      subject: 'Fresh subject',
      intro: 'Fresh intro with supplied compatibility highlights.',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
