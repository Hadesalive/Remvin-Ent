/**
 * New Note Screen
 * Create a new note/journal entry
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { NotesService } from '../services/notes.service';
import { spacing, fontSize, fontWeight } from '../lib/theme';
import { Header } from '../components/ui/Header';

interface NewNoteScreenProps {
  navigation: {
    goBack: () => void;
  };
}

export default function NewNoteScreen({ navigation }: NewNoteScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Title is required');
      return;
    }

    setSubmitting(true);
    try {
      await NotesService.createNote({
        title: title.trim(),
        content: content.trim(),
        category: category.trim() || null,
        tags: tags.trim() || null,
      });

      Alert.alert('Success', 'Note created successfully', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create note';

      Alert.alert('Error', errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Header
        title="New Note"
        subtitle="Create a new journal entry"
        actions={[
          {
            icon: 'close',
            onPress: () => navigation.goBack(),
            color: colors.foreground,
          },
          {
            icon: 'checkmark',
            onPress: handleSubmit,
            color: colors.accentContrast,
            backgroundColor: colors.accent,
            loading: submitting,
            disabled: submitting || !title.trim(),
          },
        ]}
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
          {/* Title */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Title *</Text>
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
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Category</Text>
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
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Tags</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
              value={tags}
              onChangeText={setTags}
              placeholder="Comma-separated tags"
              placeholderTextColor={colors.mutedForeground}
            />
            <Text style={[styles.hint, { color: colors.mutedForeground }]}>
              Separate tags with commas (e.g., important, meeting, follow-up)
            </Text>
          </View>

          {/* Content */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Content</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
              value={content}
              onChangeText={setContent}
              placeholder="Note content..."
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={15}
              textAlignVertical="top"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  cardTitle: {
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
    minHeight: 250,
  },
  hint: {
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
});
