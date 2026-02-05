/**
 * Notes List Screen
 * Display all notes/journal entries
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  FlatList,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
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
    return format(date, 'MMM dd, yyyy');
  } catch {
    return 'N/A';
  }
}

function formatDateTime(dateString?: string | null): string {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return format(date, 'MMM dd, yyyy hh:mm a');
  } catch {
    return 'N/A';
  }
}

export default function NotesListScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | 'all'>('all');

  useEffect(() => {
    loadNotes();
    const unsubscribe = navigation.addListener('focus', () => {
      loadNotes();
    });
    return unsubscribe;
  }, [navigation]);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const notesData = await NotesService.getNotes();
      setNotes(notesData);
    } catch (error: any) {

    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadNotes();
    setRefreshing(false);
  }, []);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    notes.forEach(note => {
      if (note.category) cats.add(note.category);
    });
    return Array.from(cats).sort();
  }, [notes]);

  const filteredNotes = useMemo(() => {
    let filtered = notes;

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(note => note.category === categoryFilter);
    }

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(note => {
        const title = note.title?.toLowerCase() || '';
        const content = note.content?.toLowerCase() || '';
        const tags = note.tags?.toLowerCase() || '';
        return title.includes(term) || content.includes(term) || tags.includes(term);
      });
    }

    return filtered;
  }, [notes, searchTerm, categoryFilter]);

  const renderNoteItem = ({ item: note, index }: { item: Note; index: number }) => {
    const preview = note.content?.substring(0, 120) || '';
    const tags = note.tags ? (typeof note.tags === 'string' ? note.tags.split(',').map(t => t.trim()) : []) : [];

    return (
      <TouchableOpacity
        style={[
          styles.noteItem,
          { 
            backgroundColor: colors.card, 
            borderColor: colors.border,
            shadowColor: isDark ? '#000' : '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: isDark ? 0.3 : 0.1,
            shadowRadius: 2,
            elevation: 2,
          },
        ]}
        onPress={() => navigation.navigate('NoteDetail', { noteId: note.id })}
        activeOpacity={0.7}
      >
        <View style={styles.noteItemContent}>
          <View style={styles.noteItemHeader}>
            <View style={styles.noteIconContainer}>
              <Ionicons 
                name="document-text" 
                size={24} 
                color={note.category ? colors.accent : colors.mutedForeground} 
              />
            </View>
            <View style={styles.noteItemLeft}>
              <View style={styles.noteTitleRow}>
                <Text style={[styles.noteTitle, { color: colors.foreground }]} numberOfLines={1}>
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
              {preview && (
                <Text style={[styles.notePreview, { color: colors.mutedForeground }]} numberOfLines={2}>
                  {preview}
                </Text>
              )}
            </View>
          </View>
          
          {(tags.length > 0 || note.createdAt) && (
            <View style={styles.noteFooter}>
              <View style={styles.noteFooterLeft}>
                <Ionicons name="time-outline" size={12} color={colors.mutedForeground} />
                <Text style={[styles.noteDate, { color: colors.mutedForeground }]}>
                  {formatDate(note.createdAt)}
                </Text>
              </View>
              {tags.length > 0 && (
                <View style={styles.tagsContainer}>
                  {tags.slice(0, 2).map((tag, idx) => (
                    <View key={idx} style={[styles.tagBadge, { backgroundColor: colors.muted }]}>
                      <Ionicons name="pricetag" size={10} color={colors.mutedForeground} />
                      <Text style={[styles.tagText, { color: colors.mutedForeground }]} numberOfLines={1}>
                        {tag}
                      </Text>
                    </View>
                  ))}
                  {tags.length > 2 && (
                    <Text style={[styles.tagMore, { color: colors.mutedForeground }]}>
                      +{tags.length - 2}
                    </Text>
                  )}
                </View>
              )}
            </View>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
      </TouchableOpacity>
    );
  };

  const renderContent = () => (
    <View>
      {/* Metrics Card */}
      <LinearGradient
        colors={isDark ? ['#7C3AED', '#A855F7'] : ['#8B5CF6', '#A78BFA']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.metricsCard}
      >
        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Total Notes</Text>
            <Text style={styles.metricValue}>{notes.length}</Text>
          </View>
          <View style={styles.metricDividerWhite} />
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Categories</Text>
            <Text style={styles.metricValue}>{categories.length}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: colors.input, borderColor: colors.border }]}>
        <Ionicons name="search-outline" size={18} color={colors.mutedForeground} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          placeholder="Search notes..."
          placeholderTextColor={colors.mutedForeground}
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
        {searchTerm.length > 0 && (
          <TouchableOpacity onPress={() => setSearchTerm('')}>
            <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>

      {/* Category Filters */}
      {categories.length > 0 && (
        <View style={styles.filtersContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersScroll}
          >
            <TouchableOpacity
              style={[
                styles.filterChip,
                {
                  backgroundColor: categoryFilter === 'all' ? colors.accent : colors.muted,
                  borderColor: categoryFilter === 'all' ? colors.accent : colors.border,
                },
              ]}
              onPress={() => setCategoryFilter('all')}
            >
              <Text
                style={[
                  styles.filterChipText,
                  {
                    color: categoryFilter === 'all' ? colors.accentContrast : colors.mutedForeground,
                  },
                ]}
              >
                All
              </Text>
            </TouchableOpacity>
            {categories.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: categoryFilter === category ? colors.accent : colors.muted,
                    borderColor: categoryFilter === category ? colors.accent : colors.border,
                  },
                ]}
                onPress={() => setCategoryFilter(category)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    {
                      color: categoryFilter === category ? colors.accentContrast : colors.mutedForeground,
                    },
                  ]}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          All Notes ({filteredNotes.length})
        </Text>
      </View>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            Loading notes...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Header
        title="Notes"
        subtitle={`${notes.length} ${notes.length === 1 ? 'note' : 'notes'}`}
        actions={[
          {
            icon: 'add',
            onPress: () => navigation.navigate('NewNote'),
            color: colors.accentContrast,
            backgroundColor: colors.accent,
            accessibilityLabel: 'Add new note',
          },
        ]}
        showBorder={false}
        useSafeArea={false}
      />
      <FlatList
        data={filteredNotes}
        renderItem={renderNoteItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.foreground }]}>No notes found</Text>
            <Text style={[styles.emptySubtext, { color: colors.mutedForeground }]}>
              {searchTerm || categoryFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Create a new note to get started'}
            </Text>
            {!searchTerm && categoryFilter === 'all' && (
              <TouchableOpacity
                style={[styles.emptyButton, { backgroundColor: colors.accent }]}
                onPress={() => navigation.navigate('NewNote')}
              >
                <Text style={[styles.emptyButtonText, { color: colors.accentContrast }]}>
                  Create Note
                </Text>
              </TouchableOpacity>
            )}
          </View>
        }
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        showsVerticalScrollIndicator={false}
      />
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
  listContent: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  metricsCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.md,
    borderRadius: 16,
    padding: spacing.lg,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: fontSize.sm,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: spacing.xs,
  },
  metricValue: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: '#FFFFFF',
  },
  metricDividerWhite: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: spacing.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.base,
  },
  filtersContainer: {
    marginBottom: spacing.md,
  },
  filtersScroll: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  sectionHeader: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  noteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
  },
  noteItemContent: {
    flex: 1,
  },
  noteItemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  noteIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  noteItemLeft: {
    flex: 1,
  },
  noteTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
    flexWrap: 'wrap',
  },
  noteTitle: {
    flex: 1,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    minWidth: 0,
  },
  categoryBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  notePreview: {
    fontSize: fontSize.sm,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  noteFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
  },
  noteFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  noteDate: {
    fontSize: fontSize.xs,
  },
  tagsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  tagText: {
    fontSize: fontSize.xs,
  },
  tagMore: {
    fontSize: fontSize.xs,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['3xl'],
    paddingHorizontal: spacing.xl,
  },
  emptyText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  emptyButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 12,
  },
  emptyButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
});
