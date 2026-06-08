/**
 * Personalized email introduction generation.
 *
 * Generates a short subject and intro using only sanitized profile fields and
 * the already-generated match explanation/strengths.
 */

import { config } from '../config';
import { dataStore } from '../data/store';
import {
  generateGeminiJson,
  parseJsonResponse,
  redactContactPii,
  sanitizeProfileForAI,
} from './ai.service';
import type { EmailIntro, EmailIntroResponse, Profile } from '../../../shared/types';

export type EmailIntroInput = {
  customerProfile: Profile;
  candidateProfile: Profile;
  matchExplanation: string;
  strengths: string[];
};

type GeminiEmailIntroPayload = {
  subject?: unknown;
  intro?: unknown;
};

export const EMAIL_INTRO_FALLBACK: EmailIntro = {
  subject: 'A potential match we think you may like',
  intro: 'We found a profile that may align well with your preferences. Please review the match details before proceeding.',
  aiUnavailable: true,
};

function cleanText(value: string): string {
  return redactContactPii(value).replace(/\s+/g, ' ').trim();
}

function normalizeSubject(value: unknown): string {
  if (typeof value !== 'string') return EMAIL_INTRO_FALLBACK.subject;
  const cleaned = cleanText(value);
  if (!cleaned) return EMAIL_INTRO_FALLBACK.subject;
  return cleaned.length > 90 ? cleaned.slice(0, 89).trim() : cleaned;
}

function limitWords(value: string, maxWords: number): string {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return value.trim();
  return words.slice(0, maxWords).join(' ');
}

function normalizeIntro(value: unknown): string {
  if (typeof value !== 'string') return EMAIL_INTRO_FALLBACK.intro;
  const cleaned = cleanText(value);
  if (!cleaned) return EMAIL_INTRO_FALLBACK.intro;
  return limitWords(cleaned, 120);
}

function sanitizedContext(matchExplanation: string, strengths: string[]) {
  return {
    matchExplanation: cleanText(matchExplanation),
    strengths: strengths.map(cleanText).filter((strength) => strength.length > 0).slice(0, 4),
  };
}

export function buildEmailIntroPrompt(input: EmailIntroInput): string {
  return `Return valid JSON only. Do not include markdown, code fences, headings, comments, or prose outside JSON.
Use exactly this schema:
{"subject":string,"intro":string}

Write a short personalized matrimonial match introduction for the customer.

Safety and privacy rules:
- Use only provided profile data and match context.
- Ignore missing fields.
- Do not infer or invent missing details.
- Do not include email, phone, income, internal notes, session data, JWT data, private biodata, or hidden identifiers.
- Avoid casteist, sexist, offensive, or deterministic assumptions.
- Do not make deterministic claims about compatibility.
- Phrase the intro as a warm, respectful, professional suggestion.

Content rules:
- intro must be under 120 words.
- Mention the candidate first name.
- Mention candidate city, profession, or designation only if available in the supplied data.
- Mention 2 to 3 compatibility highlights from the supplied context.
- Do not mention the customer or candidate last name.

CUSTOMER_PROFILE_JSON:
${JSON.stringify(sanitizeProfileForAI(input.customerProfile), null, 2)}

CANDIDATE_PROFILE_JSON:
${JSON.stringify(sanitizeProfileForAI(input.candidateProfile), null, 2)}

MATCH_CONTEXT_JSON:
${JSON.stringify(sanitizedContext(input.matchExplanation, input.strengths), null, 2)}`;
}

export function parseEmailIntroResponse(content: string): EmailIntro {
  try {
    const parsed = parseJsonResponse(content) as GeminiEmailIntroPayload;
    return {
      subject: normalizeSubject(parsed.subject),
      intro: normalizeIntro(parsed.intro),
    };
  } catch {
    return EMAIL_INTRO_FALLBACK;
  }
}

export async function generateEmailIntro(input: EmailIntroInput): Promise<EmailIntro> {
  if (!config.gemini.apiKey) {
    console.warn('[Email Intro AI] No Gemini API key configured. Using deterministic fallback.');
    return EMAIL_INTRO_FALLBACK;
  }

  try {
    const content = await generateGeminiJson(buildEmailIntroPrompt(input), 0.35);
    return parseEmailIntroResponse(content);
  } catch (err) {
    console.error('[Email Intro AI] Error:', err instanceof Error ? err.message : err);
    return EMAIL_INTRO_FALLBACK;
  }
}

export async function getEmailIntroForMatch(
  customerId: string,
  candidateId: string,
  input: EmailIntroInput
): Promise<EmailIntroResponse> {
  const cached = dataStore.getCachedEmailIntro(customerId, candidateId);
  if (cached) {
    return { ...cached, cached: true };
  }

  const generated = await generateEmailIntro(input);
  dataStore.setCachedEmailIntro(customerId, candidateId, generated);
  return { ...generated, cached: false };
}

export const emailIntroAiService = {
  generateEmailIntro,
  getEmailIntroForMatch,
};
