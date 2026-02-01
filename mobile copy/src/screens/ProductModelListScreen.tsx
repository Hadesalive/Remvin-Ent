/**
 * Product Model List Screen
 * Manage product models (add, edit, delete)
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { ProductModelService } from '../services/product-model.service';
import { ProductModel } from '../types';
import { spacing, fontSize, fontWeight } from '../lib/theme';
import { Header } from '../components/ui/Header';

export default function ProductModelListScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [models, setModels] = useState<ProductModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      setLoading(true);
      const result = await ProductModelService.getProductModels();
      if (result.error) {
        console.error('Error loading models:', result.error);
      } else if (result.data) {
        setModels(result.data);
      }
    } catch (error: any) {
      console.error('Failed to load models:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadModels();
  };

  const filteredModels = useMemo(() => {
    if (!searchTerm.trim()) return models;
    const term = searchTerm.toLowerCase();
    return models.filter(m =>
      m.name.toLowerCase().includes(term) ||
      m.brand?.toLowerCase().includes(term) ||
      m.category?.toLowerCase().includes(term)
    );
  }, [models, searchTerm]);

  const handleDelete = useCallback((model: ProductModel) => {
    Alert.alert(
      'Delete Product Model',
      `Are you sure you want to delete "${model.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await ProductModelService.deleteProductModel(model.id);
              if (result.error) {
                Alert.alert('Error', result.error.message || 'Failed to delete model');
              } else {
                loadModels();
              }
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete model');
            }
          },
        },
      ]
    );
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            Loading models...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={[]}>
      <Header
        title="Product Models"
        subtitle={`${models.length} ${models.length === 1 ? 'model' : 'models'}`}
        actions={[
          {
            icon: 'add',
            onPress: () => navigation.navigate('NewProductModel'),
            color: colors.accentContrast,
            backgroundColor: colors.accent,
            accessibilityLabel: 'Add new product model',
          },
        ]}
      />

      {/* Search */}
      <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
        <Ionicons name="search" size={20} color={colors.mutedForeground} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          placeholder="Search models..."
          placeholderTextColor={colors.mutedForeground}
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
        {searchTerm.length > 0 && (
          <TouchableOpacity onPress={() => setSearchTerm('')}>
            <Ionicons name="close-circle" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>

      {/* List */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {filteredModels.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={64} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {searchTerm ? 'No models found' : 'No product models yet'}
            </Text>
            {!searchTerm && (
              <TouchableOpacity
                style={[styles.emptyButton, { backgroundColor: colors.accent }]}
                onPress={() => navigation.navigate('NewProductModel')}
              >
                <Ionicons name="add-circle" size={20} color={colors.accentContrast} />
                <Text style={[styles.emptyButtonText, { color: colors.accentContrast }]}>
                  Create First Model
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filteredModels.map((model, index) => (
            <View
              key={model.id}
              style={[
                styles.modelCard,
                { backgroundColor: colors.card, borderColor: colors.border },
                index === filteredModels.length - 1 && styles.lastCard,
              ]}
            >
              <TouchableOpacity
                style={styles.modelContent}
                onPress={() => navigation.navigate('NewProductModel', { modelId: model.id })}
                activeOpacity={0.7}
              >
                <View style={styles.modelLeft}>
                  <View style={[styles.modelAvatar, { backgroundColor: colors.accent + '15' }]}>
                    <Ionicons name="cube" size={24} color={colors.accent} />
                  </View>
                  <View style={styles.modelInfo}>
                    <Text style={[styles.modelName, { color: colors.foreground }]}>
                      {model.name}
                    </Text>
                    <View style={styles.modelMeta}>
                      {model.brand && (
                        <Text style={[styles.modelMetaText, { color: colors.mutedForeground }]}>
                          {model.brand}
                        </Text>
                      )}
                      {model.category && (
                        <Text style={[styles.modelMetaText, { color: colors.mutedForeground }]}>
                          • {model.category}
                        </Text>
                      )}
                    </View>
                    <View style={styles.modelBadges}>
                      {model.colors && model.colors.length > 0 && (
                        <View style={[styles.badge, { backgroundColor: colors.accent + '15' }]}>
                          <Ionicons name="color-palette" size={12} color={colors.accent} />
                          <Text style={[styles.badgeText, { color: colors.accent }]}>
                            {model.colors.length} {model.colors.length === 1 ? 'color' : 'colors'}
                          </Text>
                        </View>
                      )}
                      {model.storageOptions && model.storageOptions.length > 0 && (
                        <View style={[styles.badge, { backgroundColor: colors.accent + '15' }]}>
                          <Ionicons name="disc-outline" size={12} color={colors.accent} />
                          <Text style={[styles.badgeText, { color: colors.accent }]}>
                            {model.storageOptions.length} storage
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
                {!model.isActive && (
                  <View style={[styles.inactiveBadge, { backgroundColor: colors.muted + '30' }]}>
                    <Text style={[styles.inactiveText, { color: colors.mutedForeground }]}>
                      Inactive
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDelete(model)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: fontSize.base,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: spacing.md,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: fontSize.sm,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    gap: spacing.sm,
  },
  searchIcon: {
    marginRight: spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.base,
    paddingVertical: spacing.xs,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingTop: 0,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
    gap: spacing.md,
  },
  emptyText: {
    fontSize: fontSize.base,
    textAlign: 'center',
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 12,
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  emptyButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  modelCard: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  lastCard: {
    marginBottom: 0,
  },
  modelContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  modelLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  modelAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modelInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  modelName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  modelMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  modelMetaText: {
    fontSize: fontSize.sm,
  },
  modelBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 6,
    gap: spacing.xs,
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  inactiveBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 6,
  },
  inactiveText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  deleteButton: {
    padding: spacing.sm,
    marginRight: spacing.xs,
  },
});