import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  SectionList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  ImageBackground,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography, spacing, borderRadius, shadows } from '../constants/theme';
import { Card } from '../components/Card';
import { fetchGhostPosts } from '../services/api';
import { hasGhostCredentials, getDrafts } from '../services/storage';

export const HomeScreen = ({ navigation }) => {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [hasCredentials, setHasCredentials] = useState(false);

  const loadData = async (showRefresh = false) => {
    if (showRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const hasConfig = await hasGhostCredentials();
      setHasCredentials(hasConfig);

      // Fetch Local Drafts
      const localDrafts = await getDrafts();
      const draftsSection = {
        title: 'Drafts',
        data: localDrafts.map(d => ({ ...d, isLocal: true, status: 'draft' })),
      };

      // Fetch Published Posts (if configured)
      let publishedSection = { title: 'Published', data: [] };
      if (hasConfig) {
        const result = await fetchGhostPosts({ limit: 20, status: 'all' });
        if (result.posts) {
          publishedSection.data = result.posts.map(p => ({ ...p, isLocal: false }));
        }
      }

      // Combine sections (only include if having data or always? Specter shows headers usually)
      const newSections = [];
      if (draftsSection.data.length > 0) newSections.push(draftsSection);
      if (publishedSection.data.length > 0) newSections.push(publishedSection);

      setSections(newSections);
    } catch (err) {
      console.error('Error loading data:', err);
      // Keep existing data if fail? Or show error.
      // If we have drafts but API failed, show drafts and error toast?
      // For now just set state.
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 168) {
      return `${Math.floor(diffInHours / 24)}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getStatusColor = (item) => {
    // Local drafts are always orange-ish
    if (item.isLocal) return colors.warning || '#F59E0B';

    switch (item.status) {
      case 'published':
        return colors.success || '#22C55E';
      case 'draft':
        return colors.warning || '#F59E0B';
      case 'scheduled':
        return colors.info || '#3B82F6';
      default:
        return colors.text.tertiary;
    }
  };

  const renderPost = ({ item }) => {
    const hasFeaturedImage = item.feature_image || item.featured_image;

    // Navigation handler
    const handlePress = () => {
      if (item.isLocal) {
        navigation.navigate('Editor', { draftId: item.id });
      } else {
        navigation.navigate('Editor', { ghostPostId: item.id, ghostPost: item });
      }
    };

    if (hasFeaturedImage) {
      return (
        <TouchableOpacity
          style={styles.featuredPostCard}
          onPress={handlePress}
          activeOpacity={0.9}
        >
          <ImageBackground
            source={{ uri: hasFeaturedImage }}
            style={styles.featuredImageBackground}
            imageStyle={styles.featuredImageStyle}
            resizeMode="cover"
          >
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.85)']}
              locations={[0, 0.6, 1]}
              style={styles.featuredOverlay}
            >
              <View style={styles.featuredContent}>
                <View style={styles.postMeta}>
                  <View style={[styles.statusBadge, styles.statusBadgeFeatured]}>
                    <View style={[styles.statusDot, { backgroundColor: getStatusColor(item) }]} />
                    <Text style={[styles.statusText, { color: getStatusColor(item) }]}>
                      {item.isLocal ? 'Local Draft' : item.status}
                    </Text>
                  </View>
                  <Text style={styles.postDateFeatured}>{formatDate(item.updated_at || item.created_at || item.updatedAt)}</Text>
                </View>
                <Text style={styles.postTitleFeatured} numberOfLines={2}>
                  {item.title || 'Untitled'}
                </Text>
                {item.excerpt || item.custom_excerpt ? (
                  <Text style={styles.postExcerptFeatured} numberOfLines={2}>
                    {item.custom_excerpt || item.excerpt}
                  </Text>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.8)" />
            </LinearGradient>
          </ImageBackground>
        </TouchableOpacity>
      );
    }

    return (
      <Card
        style={styles.postCard}
        onPress={handlePress}
      >
        <View style={styles.postHeader}>
          <View style={styles.postContent}>
            <View style={styles.postMeta}>
              <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item)}20` }]}>
                <View style={[styles.statusDot, { backgroundColor: getStatusColor(item) }]} />
                <Text style={[styles.statusText, { color: getStatusColor(item) }]}>
                  {item.isLocal ? 'Local Draft' : item.status}
                </Text>
              </View>
              <Text style={styles.postDate}>{formatDate(item.updated_at || item.created_at || item.updatedAt)}</Text>
            </View>
            <Text style={styles.postTitle} numberOfLines={2}>
              {item.title || 'Untitled'}
            </Text>
            {(item.excerpt || item.custom_excerpt) ? (
              <Text style={styles.postExcerpt} numberOfLines={2}>
                {item.custom_excerpt || item.excerpt}
              </Text>
            ) : null}
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
        </View>
      </Card>
    );
  };

  const renderSectionHeader = ({ section: { title } }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  );

  const renderEmptyState = () => {
    if (loading) return null;

    if (!hasCredentials && sections.length === 0) {
      return (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="cloud-offline-outline" size={48} color={colors.text.tertiary} />
          </View>
          <Text style={styles.emptyTitle}>Connect Your Blog</Text>
          <Text style={styles.emptySubtitle}>
            Configure Ghost or WordPress to see published posts
          </Text>
          <TouchableOpacity
            style={styles.configureButton}
            onPress={() => navigation.navigate('Settings')}
          >
            <Ionicons name="settings-outline" size={18} color={colors.accent} />
            <Text style={styles.configureButtonText}>Configure Settings</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Only show "No posts" if genuinely empty (no drafts, no api posts)
    if (sections.length === 0) {
      return (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="document-text-outline" size={48} color={colors.text.tertiary} />
          </View>
          <Text style={styles.emptyTitle}>No posts yet</Text>
          <Text style={styles.emptySubtitle}>
            Create your first post to get started
          </Text>
        </View>
      );
    }

    return null;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft} />
        <Text style={styles.headerTitle}>All Sheets</Text>
        <View style={styles.headerActions}>
          {/* Replaced Search with Settings shortcut for now or keep Search */}
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => console.log('Search')}
          >
            <Ionicons name="search-outline" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.navigate('Editor')}
          >
            <Ionicons name="create-outline" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.text.secondary} />
        </View>
      ) : (
        <SectionList
          sections={sections}
          renderItem={renderPost}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadData(true)}
              tintColor={colors.text.primary}
            />
          }
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
  },
  headerLeft: {
    width: 60,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'center',
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: 60,
    gap: spacing.sm,
  },
  headerButton: {
    padding: spacing.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: 40,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: spacing.lg,
    opacity: 0.5,
  },
  // Section Header
  sectionHeader: {
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
    marginTop: spacing.sm,
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  // Minimalist Post Row
  postCard: {
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
    borderRadius: 0, // Flat list style
    padding: 0,
    marginBottom: 0,
    ...Platform.select({
      ios: { shadowOpacity: 0 },
      android: { elevation: 0 },
    }),
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  postContent: {
    flex: 1,
  },
  postMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  postTitle: {
    fontSize: 17, // refined size
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2,
  },
  postExcerpt: {
    fontSize: 15,
    color: colors.text.tertiary,
    lineHeight: 20,
    marginTop: 2,
  },
  postDate: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginRight: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Empty State
  emptyState: {
    flex: 1,
    paddingTop: 100,
    alignItems: 'center',
  },
  emptyIconContainer: {
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  configureButton: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    gap: 8,
  },
  configureButtonText: {
    fontSize: 14,
    color: colors.text.primary,
  },
  retryButton: { // Adding missing style from previous code
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.accent,
    borderRadius: borderRadius.md,
    gap: 8,
  },
  retryButtonText: {
    fontSize: 14,
    color: colors.text.inverse,
  },

  // Featured
  featuredPostCard: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg, // keep rounded for featured
    overflow: 'hidden',
    height: 200,
    marginTop: spacing.sm,
  },
  featuredImageBackground: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  featuredOverlay: {
    padding: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  postTitleFeatured: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  postDateFeatured: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  statusBadgeFeatured: {
    marginBottom: 4,
  },
  featuredContent: { // Added wrapper
    flex: 1,
    justifyContent: 'flex-end',
  },
});
