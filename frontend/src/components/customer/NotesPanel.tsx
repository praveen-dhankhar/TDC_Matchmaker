'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, MessageSquarePlus } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { Note } from '@/lib/types';

type NotesPanelProps = {
  customerId: string;
};

export function NotesPanel({ customerId }: NotesPanelProps) {
  const [open, setOpen] = useState(true);
  const [notes, setNotes] = useState<Note[]>([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api
      .notes(customerId)
      .then(({ notes: nextNotes }) => {
        if (mounted) setNotes(nextNotes);
      })
      .catch((err: Error) => {
        if (mounted) setError(err.message);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [customerId]);

  async function handleAddNote() {
    const trimmed = body.trim();
    if (!trimmed) {
      setError('Note body cannot be empty.');
      return;
    }
    if (trimmed.length > 1000) {
      setError('Note body cannot exceed 1000 characters.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const { note } = await api.addNote(customerId, trimmed);
      setNotes((current) => [note, ...current]);
      setBody('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add note');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="panel overflow-hidden">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
        onClick={() => setOpen((value) => !value)}
      >
        <span>
          <span className="block text-base font-semibold text-ink">Quick Notes</span>
          <span className="block text-sm text-muted">{notes.length} meeting or call notes</span>
        </span>
        {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>

      {open ? (
        <div className="border-t border-black/10 px-5 py-5">
          <label className="block">
            <span className="field-label">Add Note</span>
            <textarea
              className="input mt-2 min-h-28 resize-y"
              value={body}
              maxLength={1000}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Capture meeting context, concerns, next steps, or family feedback."
            />
          </label>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted">{body.length}/1000 characters</p>
            <button type="button" className="btn-primary gap-2" onClick={handleAddNote} disabled={saving}>
              <MessageSquarePlus size={16} />
              {saving ? 'Adding...' : 'Add Note'}
            </button>
          </div>

          {error ? <p className="mt-3 text-sm text-blush">{error}</p> : null}

          <div className="mt-6 divide-y divide-black/10">
            {loading ? <p className="py-4 text-sm text-muted">Loading notes...</p> : null}
            {!loading && notes.length === 0 ? (
              <p className="py-4 text-sm text-muted">No notes yet.</p>
            ) : null}
            {notes.map((note) => (
              <article key={note.id} className="py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-ink">{note.matchmakerName}</p>
                  <time className="text-xs text-muted" dateTime={note.createdAt}>
                    {formatDate(note.createdAt)}
                  </time>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink">{note.body}</p>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
