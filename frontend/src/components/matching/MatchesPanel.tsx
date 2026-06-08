'use client';

import { useEffect, useState } from 'react';
import { Copy, Mail, RefreshCcw, Send, Sparkles } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Toast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import { computeAge, fullName } from '@/lib/utils';
import type { EmailIntroResponse, MatchResult } from '@/lib/types';

type MatchesPanelProps = {
  customerId: string;
};

export function MatchesPanel({ customerId }: MatchesPanelProps) {
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<MatchResult | null>(null);
  const [introMatch, setIntroMatch] = useState<MatchResult | null>(null);
  const [emailIntro, setEmailIntro] = useState<EmailIntroResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [introLoading, setIntroLoading] = useState(false);
  const [introError, setIntroError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [toastTone, setToastTone] = useState<'success' | 'error'>('success');

  async function loadMatches() {
    setLoading(true);
    setError(null);
    try {
      const { matches: nextMatches } = await api.matches(customerId, 10);
      setMatches(nextMatches);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate matches');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function confirmSend() {
    if (!selectedMatch) return;
    setSending(true);
    setError(null);
    try {
      await api.sendMatch(customerId, selectedMatch.candidateId);
      setToastTone('success');
      setToast(`${fullName(selectedMatch.candidate)}: Match sent successfully!`);
      setMatches((current) =>
        current.map((match) =>
          match.candidateId === selectedMatch.candidateId
            ? { ...match, sentAt: new Date().toISOString() }
            : match
        )
      );
      setSelectedMatch(null);
    } catch (err) {
      setToastTone('error');
      setToast(err instanceof Error ? err.message : 'Failed to send match');
    } finally {
      setSending(false);
    }
  }

  async function generateEmailIntro(match: MatchResult) {
    setIntroMatch(match);
    setEmailIntro(null);
    setIntroError(null);
    setIntroLoading(true);

    try {
      const intro = await api.emailIntro(customerId, match.candidateId);
      setEmailIntro(intro);
    } catch (err) {
      setIntroError(err instanceof Error ? err.message : 'Failed to generate email intro');
    } finally {
      setIntroLoading(false);
    }
  }

  function closeEmailIntro() {
    setIntroMatch(null);
    setEmailIntro(null);
    setIntroError(null);
  }

  async function copyEmailIntro() {
    if (!emailIntro) return;

    try {
      await navigator.clipboard.writeText(`Subject: ${emailIntro.subject}\n\n${emailIntro.intro}`);
      setToastTone('success');
      setToast('Email intro copied.');
    } catch {
      setToastTone('error');
      setToast('Copy failed.');
    }
  }

  return (
    <section className="panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 px-5 py-4">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
            <Sparkles size={18} className="text-blush" />
            AI Match Recommendations
          </h2>
          <p className="mt-1 text-sm text-muted">Top candidates ranked by rules plus Gemini scoring.</p>
        </div>
        <button type="button" className="btn-secondary gap-2" onClick={loadMatches} disabled={loading}>
          <RefreshCcw size={16} />
          Refresh
        </button>
      </div>

      <div className="grid gap-4 px-5 py-5 lg:grid-cols-2">
        {loading ? <p className="text-sm text-muted">Generating matches...</p> : null}
        {error ? <p className="text-sm text-blush">{error}</p> : null}
        {!loading && !error && matches.length === 0 ? (
          <p className="text-sm text-muted">No compatible candidates found in the dummy pool.</p>
        ) : null}

        {matches.map((match) => (
          <article
            key={match.candidateId}
            className="rounded-lg border border-black/10 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={match.candidate.profilePhotoUrl}
                alt={`${fullName(match.candidate)} profile`}
                className="h-16 w-16 rounded-lg border border-black/10 bg-white"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-ink">{fullName(match.candidate)}</h3>
                  <StatusBadge value={match.label} kind="label" />
                </div>
                <p className="mt-1 text-sm text-muted">
                  {computeAge(match.candidate.dateOfBirth)} years · {match.candidate.city} ·{' '}
                  {match.candidate.profession}
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <Score label="Rule" value={match.ruleScore} />
              <Score label="AI" value={match.aiScore} />
              <Score label="Final" value={match.finalScore} strong />
            </div>

            <p className="mt-4 text-sm leading-6 text-ink">{match.explanation}</p>
            {match.aiUnavailable ? (
              <p className="mt-2 text-xs font-semibold text-muted">AI unavailable. Showing rule-based fallback.</p>
            ) : null}

            <div className="mt-4 grid gap-4 border-t border-black/10 pt-4 md:grid-cols-2">
              <InsightList
                title="Strengths"
                items={match.strengths}
                emptyText="No specific strengths returned."
              />
              <InsightList
                title="Concerns"
                items={match.concerns}
                emptyText="No major concerns from supplied data."
              />
            </div>

            <div className="mt-4 space-y-3 border-t border-black/10 pt-4 text-sm">
              <div>
                <p className="field-label">Reasoning</p>
                <p className="mt-1 leading-6 text-ink">{match.reasoning}</p>
              </div>
              <div>
                <p className="field-label">Suggested next step</p>
                <p className="mt-1 leading-6 text-ink">{match.suggestedNextStep}</p>
              </div>
            </div>

            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="field-label">Education</dt>
                <dd className="mt-1 text-ink">{match.candidate.degree}</dd>
              </div>
              <div>
                <dt className="field-label">Lifestyle</dt>
                <dd className="mt-1 text-ink">
                  {match.candidate.diet}, {match.candidate.smoking} smoking
                </dd>
              </div>
              <div>
                <dt className="field-label">Religion / Caste</dt>
                <dd className="mt-1 text-ink">
                  {match.candidate.religion}, {match.candidate.caste}
                </dd>
              </div>
              <div>
                <dt className="field-label">Relocation</dt>
                <dd className="mt-1 text-ink">{match.candidate.openToRelocate}</dd>
              </div>
            </dl>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                className="btn-secondary flex-1 gap-2"
                disabled={introLoading && introMatch?.candidateId === match.candidateId}
                onClick={() => generateEmailIntro(match)}
              >
                <Mail size={16} />
                {introLoading && introMatch?.candidateId === match.candidateId
                  ? 'Generating...'
                  : 'Generate Email Intro'}
              </button>
              <button
                type="button"
                className="btn-primary flex-1 gap-2"
                disabled={Boolean(match.sentAt)}
                onClick={() => setSelectedMatch(match)}
              >
                <Send size={16} />
                {match.sentAt ? 'Match Sent' : 'Send Match'}
              </button>
            </div>
          </article>
        ))}
      </div>

      <Modal
        title="Email Intro"
        open={Boolean(introMatch)}
        onClose={() => {
          if (!introLoading) closeEmailIntro();
        }}
      >
        {introMatch ? (
          <div>
            <div className="flex items-start gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={introMatch.candidate.profilePhotoUrl}
                alt=""
                className="h-16 w-16 rounded-lg border border-black/10 bg-white"
              />
              <div>
                <h3 className="text-lg font-semibold text-ink">{fullName(introMatch.candidate)}</h3>
                <p className="mt-1 text-sm text-muted">
                  {computeAge(introMatch.candidate.dateOfBirth)} years · {introMatch.candidate.city} ·{' '}
                  {introMatch.candidate.profession}
                </p>
                <div className="mt-3">
                  <StatusBadge value={introMatch.label} kind="label" />
                </div>
              </div>
            </div>

            {introLoading ? <p className="mt-5 text-sm text-muted">Generating intro...</p> : null}
            {introError ? <p className="mt-5 text-sm text-blush">{introError}</p> : null}

            {emailIntro ? (
              <div className="mt-5 space-y-4">
                <div>
                  <p className="field-label">Subject</p>
                  <p className="mt-1 rounded-md border border-black/10 bg-shell px-3 py-2 text-sm font-semibold text-ink">
                    {emailIntro.subject}
                  </p>
                </div>
                <div>
                  <p className="field-label">Intro</p>
                  <p className="mt-1 rounded-md border border-black/10 bg-shell px-3 py-3 text-sm leading-6 text-ink">
                    {emailIntro.intro}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs font-semibold text-muted">
                    {emailIntro.cached ? 'Cached intro' : 'Fresh intro'}
                    {emailIntro.aiUnavailable ? ' · AI fallback' : ''}
                  </p>
                  <button type="button" className="btn-secondary gap-2" onClick={copyEmailIntro}>
                    <Copy size={16} />
                    Copy
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>

      <Modal
        title="Confirm Send Match"
        open={Boolean(selectedMatch)}
        onClose={() => (sending ? undefined : setSelectedMatch(null))}
      >
        {selectedMatch ? (
          <div>
            <div className="flex items-start gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedMatch.candidate.profilePhotoUrl}
                alt=""
                className="h-20 w-20 rounded-lg border border-black/10 bg-white"
              />
              <div>
                <h3 className="text-lg font-semibold text-ink">{fullName(selectedMatch.candidate)}</h3>
                <p className="mt-1 text-sm text-muted">
                  {computeAge(selectedMatch.candidate.dateOfBirth)} years · {selectedMatch.candidate.city} ·{' '}
                  {selectedMatch.candidate.profession}
                </p>
                <div className="mt-3">
                  <StatusBadge value={selectedMatch.label} kind="label" />
                </div>
              </div>
            </div>
            <p className="mt-5 text-sm leading-6 text-ink">{selectedMatch.explanation}</p>
            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setSelectedMatch(null)}
                disabled={sending}
              >
                Cancel
              </button>
              <button type="button" className="btn-primary gap-2" onClick={confirmSend} disabled={sending}>
                <Send size={16} />
                {sending ? 'Sending...' : 'Send Match'}
              </button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Toast message={toast} tone={toastTone} />
    </section>
  );
}

function Score({ label, value, strong = false }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className="rounded-md border border-black/10 bg-shell px-3 py-2">
      <p className="field-label">{label}</p>
      <p className={strong ? 'mt-1 text-lg font-semibold text-blush' : 'mt-1 text-lg font-semibold text-ink'}>
        {value}
      </p>
    </div>
  );
}

function InsightList({ title, items, emptyText }: { title: string; items: string[]; emptyText: string }) {
  return (
    <div>
      <p className="field-label">{title}</p>
      {items.length > 0 ? (
        <ul className="mt-2 space-y-1 text-sm leading-6 text-ink">
          {items.map((item) => (
            <li key={item} className="flex gap-2">
              <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sage" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm leading-6 text-muted">{emptyText}</p>
      )}
    </div>
  );
}
