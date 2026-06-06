import { v4 as uuidv4 } from 'uuid';
import { dataStore } from '../data/store';
import type { Note } from '../../../shared/types';

export class NotesService {
  /**
   * Get all notes for a customer, sorted reverse chronologically.
   */
  getNotesForCustomer(customerId: string): Note[] {
    return dataStore.getNotesForCustomer(customerId);
  }

  /**
   * Add a new note for a customer.
   */
  addNote(customerId: string, matchmakerId: string, matchmakerName: string, body: string): Note {
    const note: Note = {
      id: uuidv4(),
      customerId,
      matchmakerId,
      matchmakerName,
      body: body.trim(),
      createdAt: new Date().toISOString(),
    };
    return dataStore.addNote(note);
  }
}

export const notesService = new NotesService();
