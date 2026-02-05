/**
 * Notes Service
 * Handles all note/journal-related operations with Supabase
 */

import { supabase } from '../lib/supabase';
import { Note } from '../types';

/**
 * Generate a UUID-like ID
 */
function generateId(): string {
  // Use crypto.randomUUID() if available, otherwise generate a UUID-like string
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback: Generate UUID v4 format
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export const NotesService = {
  /**
   * Get all notes
   */
  async getNotes(): Promise<Note[]> {
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((note: {
        id: string;
        title: string | null;
        content: string | null;
        tags: string | null;
        category: string | null;
        user_id: string | null;
        created_at: string;
        updated_at: string;
      }) => ({
        id: note.id,
        title: note.title || '',
        content: note.content || '',
        tags: note.tags || null,
        category: note.category || null,
        userId: note.user_id || null,
        createdAt: note.created_at,
        updatedAt: note.updated_at,
      }));
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get note by ID
   */
  async getNoteById(id: string): Promise<Note | null> {
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (error) throw error;
      if (!data) return null;

      return {
        id: data.id,
        title: data.title || '',
        content: data.content || '',
        tags: data.tags || null,
        category: data.category || null,
        userId: data.user_id || null,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (error) {
      throw error;
    }
  },

  /**
   * Create a new note
   */
  async createNote(noteData: {
    title: string;
    content: string;
    tags?: string | null;
    category?: string | null;
  }): Promise<Note> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const id = generateId();
      const now = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('notes')
        .insert({
          id,
          title: noteData.title,
          content: noteData.content,
          tags: noteData.tags || null,
          category: noteData.category || null,
          user_id: user?.id || null,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        title: data.title || '',
        content: data.content || '',
        tags: data.tags || null,
        category: data.category || null,
        userId: data.user_id || null,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (error) {
      throw error;
    }
  },

  /**
   * Update a note
   */
  async updateNote(id: string, updates: {
    title?: string;
    content?: string;
    tags?: string | null;
    category?: string | null;
  }): Promise<Note> {
    try {
      const updateData: {
        updated_at: string;
        title?: string;
        content?: string;
        tags?: string | null;
        category?: string | null;
      } = {
        updated_at: new Date().toISOString(),
      };
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.content !== undefined) updateData.content = updates.content;
      if (updates.tags !== undefined) updateData.tags = updates.tags || null;
      if (updates.category !== undefined) updateData.category = updates.category || null;

      const { data, error } = await supabase
        .from('notes')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        title: data.title || '',
        content: data.content || '',
        tags: data.tags || null,
        category: data.category || null,
        userId: data.user_id || null,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (error) {
      throw error;
    }
  },

  /**
   * Delete a note (soft delete)
   */
  async deleteNote(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notes')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      throw error;
    }
  },
};
