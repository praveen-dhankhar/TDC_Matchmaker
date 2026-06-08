/**
 * TDC Matchmaker AI Scoring Service
 *
 * Uses Gemini REST API to enrich deterministic match results with
 * matchmaker-readable explanations. AI is an enhancement layer only; the rule
 * engine remains the source of deterministic compatibility signals.
 */

import { config } from '../config';
import { dataStore } from '../data/store';
import { arrayOverlap, computeAge } from '../utils/helpers';
import type { AiMatchInsight, MatchLabel, Profile } from '../../../shared/types';

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    code: number;
    message: string;
    status: string;
  };
};

type GeminiScorePayload = {
  aiScore?: unknown;
  label?: unknown;
  explanation?: unknown;
  strengths?: unknown;
  concerns?: unknown;
  reasoning?: unknown;
  suggestedNextStep?: unknown;
};

export type AiSafeProfile = Partial<{
  firstName: string;
  age: number;
  gender: Profile['gender'];
  city: string;
  country: string;
  height: number;
  education: string;
  degree: string;
  profession: string;
  designation: string;
  maritalStatus: Profile['maritalStatus'];
  languagesKnown: string[];
  religion: string;
  caste: string;
  wantKids: Profile['wantKids'];
  openToRelocate: Profile['openToRelocate'];
  openToPets: Profile['openToPets'];
  diet: Profile['diet'];
  smoking: Profile['smoking'];
  drinking: Profile['drinking'];
  hobbies: string[];
  preferredCities: string[];
  preferredReligion: string[];
  dealbreakers: string[];
  bio: string;
}>;

const VALID_LABELS: MatchLabel[] = [
  'High Potential',
  'Good Match',
  'Worth Exploring',
  'Low Compatibility',
];

function hasGeminiKey(): boolean {
  if (!config.gemini.apiKey) {
    console.warn('[AI Service] No Gemini API key configured. Using rule-based fallback.');
    return false;
  }
  return true;
}

function geminiGenerateContentUrl(): string {
  const modelPath = config.gemini.model.startsWith('models/')
    ? config.gemini.model
    : `models/${config.gemini.model}`;
  return `https://generativelanguage.googleapis.com/v1beta/${modelPath}:generateContent`;
}

export async function generateGeminiJson(prompt: string, temperature = 0.2): Promise<string> {
  const response = await fetch(geminiGenerateContentUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-goog-api-key': config.gemini.apiKey,
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature,
        response_mime_type: 'application/json',
      },
    }),
  });

  const geminiResponse = (await response.json()) as GeminiResponse;
  if (!response.ok || geminiResponse.error) {
    throw new Error(geminiResponse.error?.message || `Gemini request failed with ${response.status}`);
  }

  const content = geminiResponse.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!content) throw new Error('Empty AI response');
  return content;
}

export function redactContactPii(value: string): string {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[removed]')
    .replace(/(?:\+?\d[\d\s().-]{7,}\d)/g, '[removed]');
}

function cleanText(value: string): string {
  return redactContactPii(value).replace(/\s+/g, ' ').trim();
}

function cleanTextArray(values: string[]): string[] {
  return values.map(cleanText).filter((value) => value.length > 0);
}

/**
 * Convert a full Profile into the only fields Gemini is allowed to see.
 */
export function sanitizeProfileForAI(profile: Profile): AiSafeProfile {
  return {
    firstName: cleanText(profile.firstName),
    age: computeAge(profile.dateOfBirth),
    gender: profile.gender,
    city: cleanText(profile.city),
    country: cleanText(profile.country),
    height: profile.height,
    education: cleanText(profile.degree),
    degree: cleanText(profile.degree),
    profession: cleanText(profile.profession),
    designation: cleanText(profile.designation),
    maritalStatus: profile.maritalStatus,
    languagesKnown: cleanTextArray(profile.languagesKnown),
    religion: cleanText(profile.religion),
    caste: cleanText(profile.caste),
    wantKids: profile.wantKids,
    openToRelocate: profile.openToRelocate,
    openToPets: profile.openToPets,
    diet: profile.diet,
    smoking: profile.smoking,
    drinking: profile.drinking,
    hobbies: cleanTextArray(profile.hobbies),
    preferredCities: cleanTextArray(profile.preferredCities),
    preferredReligion: cleanTextArray(profile.preferredReligion),
    dealbreakers: cleanTextArray(profile.dealbreakers),
    bio: cleanText(profile.bio),
  };
}

export function buildMatchScoringPrompt(
  customerProfile: AiSafeProfile,
  candidateProfile: AiSafeProfile,
  ruleScore: number
): string {
  return `Return valid JSON only. Do not include markdown, code fences, headings, comments, or prose outside JSON.
Use exactly this schema:
{"aiScore":number,"label":"High Potential"|"Good Match"|"Worth Exploring"|"Low Compatibility","explanation":string,"strengths":string[],"concerns":string[],"reasoning":string,"suggestedNextStep":string}

You are supporting a professional matchmaker. Evaluate profile fit using only the supplied JSON profile data and the deterministic rule score.

Safety and privacy rules:
- Use only provided profile data.
- Ignore missing fields.
- Do not infer or invent missing details.
- Do not include email, phone, income, internal notes, session data, JWT data, or private biodata.
- Avoid casteist, sexist, offensive, or deterministic assumptions.
- Treat religion and caste only as stated preference data, without value judgments.
- Do not make deterministic claims about compatibility.
- Phrase recommendations as matchmaker-supportive suggestions.

Output rules:
- aiScore must be an integer from 0 to 100.
- explanation must be short and matchmaker-readable.
- strengths should contain 2 to 4 concise supplied-data highlights.
- concerns should contain 0 to 3 concise supplied-data gaps or risks.
- reasoning should explain natural language profile fit using only supplied data.
- suggestedNextStep should be one concise next action for the matchmaker.

DETERMINISTIC_RULE_SCORE: ${ruleScore}/100

CUSTOMER_PROFILE_JSON:
${JSON.stringify(customerProfile, null, 2)}

CANDIDATE_PROFILE_JSON:
${JSON.stringify(candidateProfile, null, 2)}`;
}

export function scoreToLabel(score: number): MatchLabel {
  if (score >= 80) return 'High Potential';
  if (score >= 60) return 'Good Match';
  if (score >= 40) return 'Worth Exploring';
  return 'Low Compatibility';
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

export function generateFallbackMatchInsight(
  customer: Profile,
  candidate: Profile,
  ruleScore: number
): AiMatchInsight {
  const strengths: string[] = [];
  const concerns: string[] = [];
  const sharedLanguages = arrayOverlap(customer.languagesKnown, candidate.languagesKnown);
  const sharedHobbies = customer.hobbies.filter((hobby) =>
    candidate.hobbies.some((candidateHobby) => candidateHobby.toLowerCase() === hobby.toLowerCase())
  );

  if (customer.city === candidate.city) {
    strengths.push(`Both profiles are based in ${customer.city}.`);
  } else if (customer.preferredCities.includes(candidate.city)) {
    strengths.push(`${candidate.city} is in the customer's preferred city list.`);
  } else if (candidate.openToRelocate !== 'No') {
    strengths.push(`${candidate.firstName} is open to relocation.`);
  } else {
    concerns.push(`Location may need review because ${candidate.firstName} is based in ${candidate.city}.`);
  }

  if (customer.religion === candidate.religion) {
    strengths.push('Their stated religion preferences align.');
  }

  if (customer.wantKids === candidate.wantKids) {
    strengths.push('Their stated views on children align.');
  } else if (customer.wantKids !== 'Maybe' && candidate.wantKids !== 'Maybe') {
    concerns.push('Their stated views on children differ.');
  }

  if (customer.diet === candidate.diet) {
    strengths.push(`They share a ${customer.diet.toLowerCase()} diet preference.`);
  }

  if (sharedLanguages > 0) {
    strengths.push('They have overlapping known languages.');
  }

  if (sharedHobbies.length > 0) {
    strengths.push(`They share interest in ${sharedHobbies.slice(0, 2).join(' and ')}.`);
  }

  if (customer.smoking !== candidate.smoking || customer.drinking !== candidate.drinking) {
    concerns.push('Lifestyle preferences around smoking or drinking may need review.');
  }

  const safeStrengths = unique(strengths).slice(0, 4);
  const safeConcerns = unique(concerns).slice(0, 3);
  const label = scoreToLabel(ruleScore);
  const ageGap = Math.abs(computeAge(customer.dateOfBirth) - computeAge(candidate.dateOfBirth));

  const explanation = safeStrengths.length > 0
    ? `${label} based on deterministic rules. Key alignments include ${safeStrengths
        .slice(0, 2)
        .map((item) => item.replace(/\.$/, '').toLowerCase())
        .join(' and ')}.`
    : `${label} based on deterministic rules. The rule score reflects available profile preferences and an age gap of ${ageGap} years.`;

  return {
    aiScore: ruleScore,
    label,
    explanation,
    strengths: safeStrengths,
    concerns: safeConcerns,
    reasoning: `AI scoring was unavailable, so this assessment uses the rule engine. The deterministic score considered supplied profile factors such as age range, city preferences, lifestyle choices, stated values, and preference alignment.`,
    suggestedNextStep: ruleScore >= 60
      ? 'Confirm mutual interest and review any preference gaps before making an introduction.'
      : 'Review the listed concerns before deciding whether to proceed with an introduction.',
    aiUnavailable: true,
  };
}

export function unavailableProfileFallback(ruleScore: number): AiMatchInsight {
  return {
    aiScore: ruleScore,
    label: scoreToLabel(ruleScore),
    explanation: 'Unable to generate AI explanation because one or both profiles could not be found.',
    strengths: [],
    concerns: ['One or both profiles could not be found.'],
    reasoning: 'The AI assessment could not run without both supplied profiles.',
    suggestedNextStep: 'Verify both profile IDs before retrying.',
    aiUnavailable: true,
  };
}

export function clampScore(score: unknown): number {
  const num = Number(score);
  if (!Number.isFinite(num)) return 50;
  return Math.max(0, Math.min(100, Math.round(num)));
}

function validateLabel(label: unknown, score: number): MatchLabel {
  if (typeof label === 'string' && VALID_LABELS.includes(label as MatchLabel)) {
    return label as MatchLabel;
  }
  return scoreToLabel(score);
}

function normalizeResponseText(value: unknown, fallback: string, maxLength: number): string {
  if (typeof value !== 'string') return fallback;
  const cleaned = cleanText(value);
  if (!cleaned) return fallback;
  return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength - 1).trim()}.` : cleaned;
}

function normalizeResponseList(value: unknown, fallback: string[], maxItems: number): string[] {
  if (!Array.isArray(value)) return fallback;

  const cleaned = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => normalizeResponseText(item, '', 180))
    .filter((item) => item.length > 0);

  return cleaned.length > 0 ? unique(cleaned).slice(0, maxItems) : fallback;
}

export function parseJsonResponse(content: string): unknown {
  const withoutFences = content
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

  try {
    return JSON.parse(withoutFences);
  } catch {
    const firstBrace = withoutFences.indexOf('{');
    const lastBrace = withoutFences.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return JSON.parse(withoutFences.slice(firstBrace, lastBrace + 1));
    }
    throw new Error('Gemini response was not valid JSON');
  }
}

export function parseAiMatchResponse(content: string, fallback: AiMatchInsight): AiMatchInsight {
  try {
    const parsed = parseJsonResponse(content) as GeminiScorePayload;
    const aiScore = clampScore(parsed.aiScore ?? fallback.aiScore);

    return {
      aiScore,
      label: validateLabel(parsed.label, aiScore),
      explanation: normalizeResponseText(parsed.explanation, fallback.explanation, 420),
      strengths: normalizeResponseList(parsed.strengths, fallback.strengths, 4),
      concerns: normalizeResponseList(parsed.concerns, fallback.concerns, 3),
      reasoning: normalizeResponseText(parsed.reasoning, fallback.reasoning, 800),
      suggestedNextStep: normalizeResponseText(parsed.suggestedNextStep, fallback.suggestedNextStep, 220),
    };
  } catch {
    return fallback;
  }
}

/**
 * Score a single customer-candidate pair using AI when available.
 * Returns cached result if present. Falls back to deterministic scoring on error.
 */
export async function scoreWithAI(
  customerId: string,
  candidateId: string,
  ruleScore: number
): Promise<AiMatchInsight> {
  const cached = dataStore.getCachedAiScore(customerId, candidateId);
  if (cached) {
    return cached;
  }

  const customer = dataStore.getCustomerById(customerId);
  const candidate = dataStore.getCustomerById(candidateId);
  if (!customer || !candidate) {
    return unavailableProfileFallback(ruleScore);
  }

  const fallback = generateFallbackMatchInsight(customer, candidate, ruleScore);

  if (!hasGeminiKey()) {
    dataStore.setCachedAiScore(customerId, candidateId, fallback);
    return fallback;
  }

  try {
    const prompt = buildMatchScoringPrompt(
      sanitizeProfileForAI(customer),
      sanitizeProfileForAI(candidate),
      ruleScore
    );

    const content = await generateGeminiJson(prompt, 0.2);
    const result = parseAiMatchResponse(content, fallback);

    dataStore.setCachedAiScore(customerId, candidateId, result);
    console.log(`[AI Service] Gemini scored ${customerId}:${candidateId}: ${result.aiScore} (${result.label})`);
    return result;
  } catch (err) {
    console.error('[AI Service] Error:', err instanceof Error ? err.message : err);
    dataStore.setCachedAiScore(customerId, candidateId, fallback);
    return fallback;
  }
}

export const aiService = {
  scoreWithAI,
};
