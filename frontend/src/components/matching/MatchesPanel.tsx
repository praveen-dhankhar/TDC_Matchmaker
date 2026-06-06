'use client';

import { useEffect, useState } from 'react';
import { RefreshCcw, Send, Sparkles } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Toast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import { computeAge, fullName } from '@/lib/utils';
import type { MatchResult } from '@/lib/types';

type MatchesPanelProps = {
  customerId: string;
};

export function MatchesPanel({ customerId }: MatchesPanelProps) {
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<MatchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
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

            <button
              type="button"
              className="btn-primary mt-4 w-full gap-2"
              disabled={Boolean(match.sentAt)}
              onClick={() => setSelectedMatch(match)}
            >
              <Send size={16} />
              {match.sentAt ? 'Match Sent' : 'Send Match'}
            </button>
          </article>
        ))}
      </div>

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
