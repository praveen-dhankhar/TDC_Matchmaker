/**
 * TDC Matchmaker — Mock Email Service
 *
 * Simulates email sending for the MVP. Logs email content to console.
 * For production: replace with SendGrid/SES/SMTP adapter.
 */

import { computeAge } from '../utils/helpers';
import type { Profile, MatchLabel } from '../../../shared/types';

interface MatchEmailPayload {
  customer: Profile;
  candidate: Profile;
  aiScore: number;
  label: MatchLabel;
  explanation: string;
  matchmakerName: string;
}

/**
 * Send a mock match notification email.
 * Returns immediately (fire-and-forget).
 */
export async function sendMatchEmail(payload: MatchEmailPayload): Promise<void> {
  const { customer, candidate, aiScore, label, explanation, matchmakerName } = payload;

  const emailContent = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 MATCH NOTIFICATION (Mock Email)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

To: ${customer.firstName} ${customer.lastName}
Subject: We Found a Great Match for You! 🎉

Dear ${customer.firstName},

${matchmakerName} from The Date Crew has found a potential match for you!

━━━ Match Details ━━━
Name: ${candidate.firstName} ${candidate.lastName}
Age: ${computeAge(candidate.dateOfBirth)} years
City: ${candidate.city}
Profession: ${candidate.profession}
Education: ${candidate.degree}${candidate.postgraduateDegree ? ` | ${candidate.postgraduateDegree}` : ''}

━━━ Compatibility ━━━
Score: ${aiScore}/100 (${label})
${explanation}

━━━━━━━━━━━━━━━━━━━━━
This is an automated notification from The Date Crew Matchmaker Platform.
For questions, contact your assigned matchmaker.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

  // Simulate async email send with a small delay
  await new Promise((resolve) => setTimeout(resolve, 100));
  console.log(emailContent);
  console.log(`[Email Service] Match email sent for ${customer.firstName} → ${candidate.firstName} (mock)`);
}

export const emailService = { sendMatchEmail };
