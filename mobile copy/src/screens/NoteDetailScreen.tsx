/**
 * Note Detail Screen
 * View and edit a note
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { NotesService } from '../services/notes.service';
import { Note } from '../types';
import { spacing, fontSize, fontWeight } from '../lib/theme';
import { format } from 'date-fns';
import { Header } from '../components/ui/Header';

function formatDate(dateString?: string | null): string {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return format(date, 'MMM dd, yyyy hh:mm a');
  } catch {
    return 'N/A';
  }
}

export default function NoteDetailScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { noteId } = route.params;
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // Edit state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');

  useEffect(() => {
    loadNote();
  }, [noteId]);

  const loadNote = async () => {
    try {
      setLoading(true);
      const noteData = await NotesService.getNoteById(noteId);
      
      if (!noteData) {
        Alert.alert('Error', 'Note not found');
        navigation.goBack();
        return;
      }

      setNote(noteData);
      setTitle(noteData.title || '');
      setContent(noteData.content || '');
      setCategory(noteData.category || '');
      setTags(noteData.tags || '');
    } catch (error: any) {

      Alert.alert('Error', 'Failed to load note');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Title is required');
      return;
    }

    setSaving(true);
    try {
      await NotesService.updateNote(noteId, {
        title: title.trim(),
        content: content.trim(),
        category: category.trim() || null,
        tags: tags.trim() || null,
      });

      await loadNote();
      setEditing(false);
      Alert.alert('Success', 'Note updated successfully');
    } catch (error: any) {

      Alert.alert('Error', error.message || 'Failed to update note');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Note',
      'Are you sure you want to delete this note? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              await NotesService.deleteNote(noteId);
              Alert.alert('Success', 'Note deleted successfully', [
                {
                  text: 'OK',
                  onPress: () => navigation.goBack(),
                },
              ]);
            } catch (error: any) {

              Alert.alert('Error', 'Failed to delete note. Please try again.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            Loading note...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!note) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={64} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Note not found</Text>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.accent }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.backButtonText, { color: colors.accentContrast }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const tagArray = note.tags ? (typeof note.tags === 'string' ? note.tags.split(',').map(t => t.trim()) : []) : [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Header
        title={editing ? 'Edit Note' : note.title || 'Untitled Note'}
        subtitle={editing ? 'Update note details' : formatDate(note.createdAt)}
        actions={
          editing
            ? [
                {
                  icon: 'close',
                  onPress: () => {
                    setEditing(false);
                    setTitle(note.title || '');
                    setContent(note.content || '');
                    setCategory(note.category || '');
                    setTags(note.tags || '');
                  },
                  color: colors.foreground,
                },
                {
                  icon: saving ? undefined : 'checkmark',
                  onPress: handleSave,
                  color: colors.accentContrast,
                  backgroundColor: colors.accent,
                  loading: saving,
                },
              ]
            : [
                {
                  icon: 'create-outline',
                  onPress: () => setEditing(true),
                  color: colors.foreground,
                },
                {
                  icon: deleting ? undefined : 'trash-outline',
                  onPress: handleDelete,
                  color: colors.destructive,
                  loading: deleting,
                },
              ]
        }
        showBorder={false}
        useSafeArea={false}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + spacing.lg, spacing.xl) }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {editing ? (
            <>
              {/* Title */}
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.label, { color: colors.foreground }]}>Title *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Note title"
                  placeholderTextColor={colors.mutedForeground}
                />
              </View>

              {/* Category */}
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.label, { color: colors.foreground }]}>Category</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                  value={category}
                  onChangeText={setCategory}
                  placeholder="e.g., Meeting, Task, Idea"
                  placeholderTextColor={colors.mutedForeground}
                />
              </View>

              {/* Tags */}
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.label, { color: colors.foreground }]}>Tags</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                  value={tags}
                  onChangeText={setTags}
                  placeholder="Comma-separated tags"
                  placeholderTextColor={colors.mutedForeground}
                />
                <Text style={[styles.hint, { color: colors.mutedForeground }]}>
                  Separate tags with commas
                </Text>
              </View>

              {/* Content */}
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.label, { color: colors.foreground }]}>Content</Text>
                <TextInput
                  style={[styles.textArea, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                  value={content}
                  onChangeText={setContent}
                  placeholder="Note content..."
                  placeholderTextColor={colors.mutedForeground}
                  multiline
                  numberOfLines={10}
                  textAlignVertical="top"
                />
              </View>
            </>
          ) : (
            <>
              {/* Title */}
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.noteTitle, { color: colors.foreground }]}>
                  {note.title || 'Untitled Note'}
                </Text>
                {note.category && (
                  <View style={[styles.categoryBadge, { backgroundColor: colors.accent + '15' }]}>
                    <Text style={[styles.categoryText, { color: colors.accent }]}>
                      {note.category}
                    </Text>
                  </View>
                )}
              </View>

              {/* Tags */}
              {tagArray.length > 0 && (
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.label, { color: colors.mutedForeground }]}>Tags</Text>
                  <View style={styles.tagsContainer}>
                    {tagArray.map((tag, idx) => (
                      <View key={idx} style={[styles.tagBadge, { backgroundColor: colors.muted }]}>
                        <Text style={[styles.tagText, { color: colors.mutedForeground }]}>
                          {tag}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Content */}
              {note.content && (
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.contentText, { color: colors.foreground }]}>
                    {note.content}
                  </Text>
                </View>
              )}

              {/* Details */}
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Details</Text>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Created:</Text>
                  <Text style={[styles.detailValue, { color: colors.foreground }]}>
                    {formatDate(note.createdAt)}
                  </Text>
                </View>
                {note.updatedAt && note.updatedAt !== note.createdAt && (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Updated:</Text>
                    <Text style={[styles.detailValue, { color: colors.foreground }]}>
                      {formatDate(note.updatedAt)}
                    </Text>
                  </View>
                )}
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.base,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyText: {
    fontSize: fontSize.lg,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  backButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 12,
  },
  backButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  card: {
    padding: spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.sm,
  },
  input: {
    fontSize: fontSize.base,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
  },
  textArea: {
    fontSize: fontSize.base,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 200,
  },
  hint: {
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  noteTitle: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    marginBottom: spacing.sm,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    marginTop: spacing.xs,
  },
  categoryText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  tagBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
  },
  tagText: {
    fontSize: fontSize.xs,
  },
  contentText: {
    fontSize: fontSize.base,
    lineHeight: 24,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  detailLabel: {
    fontSize: fontSize.sm,
  },
  detailValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
});
