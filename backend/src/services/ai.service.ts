/**
 * TDC Matchmaker — AI Scoring Service
 *
 * Uses Gemini REST API to generate rich natural language match explanations
 * and AI-powered compatibility scores. Includes caching and rule-based fallback.
 */

import { config } from '../config';
import { dataStore } from '../data/store';
import { computeAge } from '../utils/helpers';
import type { Profile, MatchLabel } from '../../../shared/types';

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
};

function hasGeminiKey(): boolean {
  if (!config.gemini.apiKey) {
    console.warn('[AI Service] No Gemini API key configured — using rule-based fallback');
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

/**
 * Build a concise profile summary for the AI prompt (no PII).
 */
function profileSummary(profile: Profile): string {
  const age = computeAge(profile.dateOfBirth);
  return [
    `${profile.firstName}, ${age}y, ${profile.gender}`,
    `City: ${profile.city} | Open to relocate: ${profile.openToRelocate}`,
    `Religion: ${profile.religion}, Caste: ${profile.caste}`,
    `Education: ${profile.degree}${profile.postgraduateDegree ? `, ${profile.postgraduateDegree}` : ''}`,
    `Profession: ${profile.profession} at ${profile.currentCompany} (${profile.designation})`,
    `Income: ${profile.income}`,
    `Marital Status: ${profile.maritalStatus} | Family: ${profile.familyType}`,
    `Height: ${profile.height}cm | Body Type: ${profile.bodyType}`,
    `Diet: ${profile.diet} | Drinking: ${profile.drinking} | Smoking: ${profile.smoking}`,
    `Want Kids: ${profile.wantKids} | Open to Pets: ${profile.openToPets}`,
    `Languages: ${profile.languagesKnown.join(', ')}`,
    `Hobbies: ${profile.hobbies.join(', ')}`,
    `Bio: ${profile.bio}`,
  ].join('\n');
}

/**
 * Generate the AI scoring prompt.
 */
function buildPrompt(customerSummary: string, candidateSummary: string, ruleScore: number): string {
  return `Return a single minified JSON object only. Do not include markdown, code fences, headings, or prose outside the JSON.
Schema: {"aiScore": number, "label": "High Potential"|"Good Match"|"Worth Exploring"|"Low Compatibility", "explanation": string}.

You are an expert Indian matrimonial matchmaker. Evaluate the compatibility between these two profiles.

CUSTOMER (seeking a match):
${customerSummary}

CANDIDATE (potential match):
${candidateSummary}

Rule-based compatibility score: ${ruleScore}/100

Provide your assessment as a JSON object with exactly these fields:
- "aiScore": number (0-100), your AI-based compatibility score
- "label": one of "High Potential", "Good Match", "Worth Exploring", "Low Compatibility"
- "explanation": string (2-3 sentences explaining why they match or don't, mentioning specific compatible/incompatible factors like shared values, career alignment, lifestyle, location, family background)

Consider Indian matrimonial conventions: religion, caste, family values, career stability, location preferences, lifestyle alignment, and shared interests.

The explanation must be 2-3 sentences and mention specific compatible or incompatible factors such as shared values, career alignment, lifestyle, location, or family background.`;
}

/**
 * Determine label from a numeric score.
 */
function scoreToLabel(score: number): MatchLabel {
  if (score >= 80) return 'High Potential';
  if (score >= 60) return 'Good Match';
  if (score >= 40) return 'Worth Exploring';
  return 'Low Compatibility';
}

/**
 * Generate a rule-based explanation as fallback when AI is unavailable.
 */
function generateFallbackExplanation(
  customer: Profile,
  candidate: Profile,
  ruleScore: number
): string {
  const factors: string[] = [];
  const customerAge = computeAge(customer.dateOfBirth);
  const candidateAge = computeAge(candidate.dateOfBirth);

  if (customer.religion === candidate.religion) {
    factors.push(`shared ${customer.religion} background`);
  }
  if (customer.city === candidate.city) {
    factors.push(`both based in ${customer.city}`);
  }
  if (customer.wantKids === candidate.wantKids) {
    factors.push('aligned views on having children');
  }
  if (customer.diet === candidate.diet) {
    factors.push(`similar dietary preferences (${customer.diet})`);
  }
  const sharedHobbies = customer.hobbies.filter((h) =>
    candidate.hobbies.map((ch) => ch.toLowerCase()).includes(h.toLowerCase())
  );
  if (sharedHobbies.length > 0) {
    factors.push(`shared interests in ${sharedHobbies.slice(0, 2).join(' and ')}`);
  }

  const label = scoreToLabel(ruleScore);
  if (factors.length === 0) {
    return `${label} match based on overall compatibility analysis. Age difference of ${Math.abs(customerAge - candidateAge)} years. Score based on compatibility rules.`;
  }

  return `${label} — ${factors.slice(0, 3).join(', ')}. Compatibility score reflects alignment across key matrimonial factors.`;
}

/**
 * Score a single customer–candidate pair using AI.
 * Returns cached result if available. Falls back to rule-based scoring on error.
 */
export async function scoreWithAI(
  customerId: string,
  candidateId: string,
  ruleScore: number
): Promise<{ aiScore: number; label: MatchLabel; explanation: string }> {
  // Check cache first
  const cached = dataStore.getCachedAiScore(customerId, candidateId);
  if (cached) {
    return cached as { aiScore: number; label: MatchLabel; explanation: string };
  }

  const customer = dataStore.getCustomerById(customerId);
  const candidate = dataStore.getCustomerById(candidateId);
  if (!customer || !candidate) {
    return {
      aiScore: ruleScore,
      label: scoreToLabel(ruleScore),
      explanation: 'Unable to generate AI explanation — profile not found.',
    };
  }

  if (!hasGeminiKey()) {
    // No API key — use fallback
    const result = {
      aiScore: ruleScore,
      label: scoreToLabel(ruleScore),
      explanation: generateFallbackExplanation(customer, candidate, ruleScore),
    };
    dataStore.setCachedAiScore(customerId, candidateId, result);
    return result;
  }

  try {
    const prompt = buildPrompt(
      profileSummary(customer),
      profileSummary(candidate),
      ruleScore
    );

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
          temperature: 0.2,
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

    const parsed = parseJsonResponse(content) as GeminiScorePayload;

    const result = {
      aiScore: clampScore(parsed.aiScore),
      label: validateLabel(parsed.label),
      explanation: typeof parsed.explanation === 'string'
        ? parsed.explanation
        : generateFallbackExplanation(customer, candidate, ruleScore),
    };

    // Cache the result
    dataStore.setCachedAiScore(customerId, candidateId, result);

    console.log(`[AI Service] Gemini scored ${customerId} ↔ ${candidateId}: ${result.aiScore} (${result.label})`);
    return result;
  } catch (err) {
    console.error('[AI Service] Error:', err instanceof Error ? err.message : err);
    // Fallback to rule-based
    const result = {
      aiScore: ruleScore,
      label: scoreToLabel(ruleScore),
      explanation: generateFallbackExplanation(customer, candidate, ruleScore),
    };
    dataStore.setCachedAiScore(customerId, candidateId, result);
    return result;
  }
}

function clampScore(score: unknown): number {
  const num = Number(score);
  if (isNaN(num)) return 50;
  return Math.max(0, Math.min(100, Math.round(num)));
}

function validateLabel(label: unknown): MatchLabel {
  const valid: MatchLabel[] = ['High Potential', 'Good Match', 'Worth Exploring', 'Low Compatibility'];
  if (typeof label === 'string' && valid.includes(label as MatchLabel)) {
    return label as MatchLabel;
  }
  return 'Worth Exploring';
}

function parseJsonResponse(content: string): unknown {
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

export const aiService = { scoreWithAI };
