import { Router, Response } from 'express';
import { profileService } from '../services/profile.service';
import { notesService } from '../services/notes.service';
import { matchingService } from '../services/matching.service';
import { aiService } from '../services/ai.service';
import { emailService } from '../services/email.service';
import { emailIntroAiService } from '../services/emailIntroAi.service';
import { dataStore } from '../data/store';
import { validateBody } from '../middleware/error';
import { createNoteSchema, updateStatusSchema, sendMatchSchema } from '../middleware/validation';
import { decrypt, isEncrypted } from '../utils/encryption';
import type { AuthenticatedRequest } from '../middleware/auth';
import type { MatchResult } from '../../../shared/types';

const router = Router();

/**
 * GET /api/customers
 * List all customers assigned to the authenticated matchmaker.
 */
router.get('/', (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized', message: 'Not authenticated', statusCode: 401 });
    return;
  }

  const customers = profileService.getCustomersList(req.user.userId);
  res.json({ customers });
});

/**
 * GET /api/customers/:id
 * Get full biodata for a specific customer.
 */
router.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized', message: 'Not authenticated', statusCode: 401 });
    return;
  }

  const customer = profileService.getCustomerDetail(req.params.id, req.user.userId);
  if (!customer) {
    res.status(404).json({
      error: 'Not Found',
      message: 'Customer not found or not assigned to you',
      statusCode: 404,
    });
    return;
  }

  res.json({ customer });
});

/**
 * PATCH /api/customers/:id/status
 * Update customer journey status.
 */
router.patch('/:id/status', validateBody(updateStatusSchema), (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized', message: 'Not authenticated', statusCode: 401 });
    return;
  }

  const updated = profileService.updateStatus(req.params.id, req.user.userId, req.body.status);
  if (!updated) {
    res.status(404).json({
      error: 'Not Found',
      message: 'Customer not found or not assigned to you',
      statusCode: 404,
    });
    return;
  }

  const customer = profileService.getCustomerDetail(req.params.id, req.user.userId);
  res.json({ customer: customer || updated });
});

/**
 * GET /api/customers/:id/matches
 * Run the matching algorithm + AI scoring for a customer.
 */
router.get('/:id/matches', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized', message: 'Not authenticated', statusCode: 401 });
    return;
  }

  if (!dataStore.isCustomerOwnedByMatchmaker(req.params.id, req.user.userId)) {
    res.status(404).json({
      error: 'Not Found',
      message: 'Customer not found or not assigned to you',
      statusCode: 404,
    });
    return;
  }

  try {
    const parsedLimit = parseInt(req.query.limit as string, 10);
    const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 20) : 10;
    const scoredCandidates = matchingService.findMatches(req.params.id, limit);

    // Enrich with AI scores
    const matches: MatchResult[] = await Promise.all(
      scoredCandidates.map(async ({ candidate, ruleScore }) => {
        const aiResult = await aiService.scoreWithAI(
          req.params.id,
          candidate.id,
          ruleScore
        );

        // Compute final weighted score
        const finalScore = matchingService.calculateFinalScore(ruleScore, aiResult.aiScore);

        // Check if already sent
        const alreadySent = dataStore.isMatchAlreadySent(req.params.id, candidate.id);

        // Decrypt PII for response
        const decryptedCandidate = {
          ...candidate,
          email: isEncrypted(candidate.email) ? decrypt(candidate.email) : candidate.email,
          phoneNumber: isEncrypted(candidate.phoneNumber) ? decrypt(candidate.phoneNumber) : candidate.phoneNumber,
        };

        return {
          candidateId: candidate.id,
          candidate: decryptedCandidate,
          ruleScore,
          aiScore: aiResult.aiScore,
          finalScore,
          label: aiResult.label,
          explanation: aiResult.explanation,
          strengths: aiResult.strengths,
          concerns: aiResult.concerns,
          reasoning: aiResult.reasoning,
          suggestedNextStep: aiResult.suggestedNextStep,
          aiUnavailable: aiResult.aiUnavailable,
          sentAt: alreadySent ? dataStore.getSentMatches(req.params.id).find((m) => m.candidateId === candidate.id)?.sentAt : undefined,
        };
      })
    );

    // Sort by final score
    matches.sort((a, b) => b.finalScore - a.finalScore);

    res.json({ matches, fromCache: false });
  } catch (err) {
    console.error('[Customers Route] Matching error:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to generate matches',
      statusCode: 500,
    });
  }
});

/**
 * POST /api/customers/:id/matches/:candidateId/email-intro
 * Generate a personalized short email introduction for a match.
 */
router.post('/:id/matches/:candidateId/email-intro', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized', message: 'Not authenticated', statusCode: 401 });
    return;
  }

  if (!dataStore.isCustomerOwnedByMatchmaker(req.params.id, req.user.userId)) {
    res.status(404).json({
      error: 'Not Found',
      message: 'Customer not found or not assigned to you',
      statusCode: 404,
    });
    return;
  }

  const customer = dataStore.getCustomerById(req.params.id);
  const candidate = dataStore.getCustomerById(req.params.candidateId);
  if (!customer || !candidate) {
    res.status(404).json({
      error: 'Not Found',
      message: 'Customer or candidate not found',
      statusCode: 404,
    });
    return;
  }

  const cachedIntro = dataStore.getCachedEmailIntro(req.params.id, req.params.candidateId);
  if (cachedIntro) {
    res.json({ ...cachedIntro, cached: true });
    return;
  }

  const scoredMatch = matchingService
    .findMatches(req.params.id, 120)
    .find(({ candidate: scoredCandidate }) => scoredCandidate.id === req.params.candidateId);
  const ruleScore = scoredMatch?.ruleScore ?? 50;
  const aiResult = await aiService.scoreWithAI(req.params.id, req.params.candidateId, ruleScore);

  const intro = await emailIntroAiService.getEmailIntroForMatch(
    req.params.id,
    req.params.candidateId,
    {
      customerProfile: customer,
      candidateProfile: candidate,
      matchExplanation: aiResult.explanation,
      strengths: aiResult.strengths,
    }
  );

  res.json(intro);
});

/**
 * POST /api/customers/:id/send-match
 * Send a match notification (fire-and-forget).
 */
router.post('/:id/send-match', validateBody(sendMatchSchema), async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized', message: 'Not authenticated', statusCode: 401 });
    return;
  }

  if (!dataStore.isCustomerOwnedByMatchmaker(req.params.id, req.user.userId)) {
    res.status(404).json({
      error: 'Not Found',
      message: 'Customer not found or not assigned to you',
      statusCode: 404,
    });
    return;
  }

  const { candidateId } = req.body;

  // Check if already sent
  if (dataStore.isMatchAlreadySent(req.params.id, candidateId)) {
    res.status(409).json({
      error: 'Conflict',
      message: 'This match has already been sent',
      statusCode: 409,
    });
    return;
  }

  const customer = dataStore.getCustomerById(req.params.id);
  const candidate = dataStore.getCustomerById(candidateId);
  if (!customer || !candidate) {
    res.status(404).json({
      error: 'Not Found',
      message: 'Customer or candidate not found',
      statusCode: 404,
    });
    return;
  }

  const scoredMatch = matchingService
    .findMatches(req.params.id, 120)
    .find(({ candidate: scoredCandidate }) => scoredCandidate.id === candidateId);
  const ruleScore = scoredMatch?.ruleScore ?? 50;

  // Get AI score (usually cached from the matches view)
  const aiResult = await aiService.scoreWithAI(req.params.id, candidateId, ruleScore);
  const finalScore = matchingService.calculateFinalScore(ruleScore, aiResult.aiScore);

  // Record the sent match
  const matchResult: MatchResult = {
    candidateId,
    candidate,
    ruleScore,
    aiScore: aiResult.aiScore,
    finalScore,
    label: aiResult.label,
    explanation: aiResult.explanation,
    strengths: aiResult.strengths,
    concerns: aiResult.concerns,
    reasoning: aiResult.reasoning,
    suggestedNextStep: aiResult.suggestedNextStep,
    aiUnavailable: aiResult.aiUnavailable,
    sentAt: new Date().toISOString(),
  };
  dataStore.recordSentMatch(req.params.id, matchResult);

  // Fire-and-forget email
  const user = dataStore.getUserById(req.user.userId);
  emailService.sendMatchEmail({
    customer,
    candidate,
    aiScore: aiResult.aiScore,
    label: aiResult.label,
    explanation: aiResult.explanation,
    matchmakerName: user?.name || 'Matchmaker',
  }).catch((err) => console.error('[Email] Failed:', err));

  // Return 202 Accepted immediately
  res.status(202).json({
    message: `Match sent successfully! ${candidate.firstName} ${candidate.lastName} has been notified.`,
    matchId: `${req.params.id}:${candidateId}`,
  });
});

/**
 * GET /api/customers/:id/notes
 * Get all notes for a customer.
 */
router.get('/:id/notes', (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized', message: 'Not authenticated', statusCode: 401 });
    return;
  }

  if (!dataStore.isCustomerOwnedByMatchmaker(req.params.id, req.user.userId)) {
    res.status(404).json({
      error: 'Not Found',
      message: 'Customer not found or not assigned to you',
      statusCode: 404,
    });
    return;
  }

  const notes = notesService.getNotesForCustomer(req.params.id);
  res.json({ notes });
});

/**
 * POST /api/customers/:id/notes
 * Add a new note for a customer.
 */
router.post('/:id/notes', validateBody(createNoteSchema), (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized', message: 'Not authenticated', statusCode: 401 });
    return;
  }

  if (!dataStore.isCustomerOwnedByMatchmaker(req.params.id, req.user.userId)) {
    res.status(404).json({
      error: 'Not Found',
      message: 'Customer not found or not assigned to you',
      statusCode: 404,
    });
    return;
  }

  const user = dataStore.getUserById(req.user.userId);
  const note = notesService.addNote(
    req.params.id,
    req.user.userId,
    user?.name || 'Unknown',
    req.body.body
  );

  res.status(201).json({ note });
});

export default router;
