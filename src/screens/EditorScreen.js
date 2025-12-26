import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '../constants/theme';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { RichTextEditor, TagSelector } from '../components';
import { saveDraft, getDraftById, getActivePlatform } from '../services/storage';
import { publishToGhost, updateGhostPost, fetchGhostPostById, createPostOnPlatform, updatePostOnPlatform } from '../services/api';
import { pickImageFromGallery } from '../services/imageService';
import { htmlTemplates } from '../constants/htmlTemplates';

export const EditorScreen = ({ navigation, route }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [featuredImage, setFeaturedImage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showPublishOptions, setShowPublishOptions] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState(null);
  const [ghostPostId, setGhostPostId] = useState(null);
  const [ghostPostStatus, setGhostPostStatus] = useState(null);
  const [titleFocused, setTitleFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedTags, setSelectedTags] = useState([]);
  const [publishStatus, setPublishStatus] = useState('draft');
  const [activePlatform, setActivePlatform] = useState('ghost');
  const editorRef = useRef(null);

  // Load active platform on mount
  useEffect(() => {
    const loadPlatform = async () => {
      const platform = await getActivePlatform();
      setActivePlatform(platform);
    };
    loadPlatform();
  }, []);

  useEffect(() => {
    const loadContent = async () => {
      // Load Ghost post if ghostPostId is provided
      if (route.params?.ghostPostId) {
        setLoading(true);
        try {
          // Use passed ghost post data if available, otherwise fetch
          if (route.params?.ghostPost) {
            const post = route.params.ghostPost;
            setTitle(post.title || '');
            setContent(post.html || post.mobiledoc || '');
            setFeaturedImage(post.feature_image || null);
            setGhostPostId(post.id);
            setGhostPostStatus(post.status);
            // Load existing tags
            if (post.tags && post.tags.length > 0) {
              setSelectedTags(post.tags.map(tag => ({
                id: tag.id,
                name: tag.name,
                slug: tag.slug,
              })));
            }
          } else {
            const result = await fetchGhostPostById(route.params.ghostPostId);
            if (result?.post) {
              const post = result.post;
              setTitle(post.title || '');
              setContent(post.html || '');
              setFeaturedImage(post.feature_image || null);
              setGhostPostId(post.id);
              setGhostPostStatus(post.status);
              // Load existing tags
              if (post.tags && post.tags.length > 0) {
                setSelectedTags(post.tags.map(tag => ({
                  id: tag.id,
                  name: tag.name,
                  slug: tag.slug,
                })));
              }
            }
          }
        } catch (error) {
          Alert.alert('Error', 'Failed to load post from Ghost');
          console.error('Error loading Ghost post:', error);
        } finally {
          setLoading(false);
        }
      }
      // Load local draft if draftId is provided
      else if (route.params?.draftId) {
        const draft = await getDraftById(route.params.draftId);
        if (draft) {
          setTitle(draft.title || '');
          setContent(draft.content || '');
          setFeaturedImage(draft.featured_image || null);
          setCurrentDraftId(draft.id);
          // Parse tags if stored
          if (draft.tags) {
            const parsedTags = typeof draft.tags === 'string' ? JSON.parse(draft.tags) : draft.tags;
            setSelectedTags(parsedTags || []);
          }
        }
      }
    };
    loadContent();
  }, [route.params?.draftId, route.params?.ghostPostId]);

  const handleSaveDraft = async () => {
    if (!title.trim() && !content.trim()) {
      Alert.alert('Error', 'Please add a title or content before saving');
      return;
    }

    setSaving(true);
    try {
      const draft = await saveDraft({
        id: currentDraftId,
        title,
        content,
        featured_image: featuredImage,
        tags: selectedTags,
        platform: activePlatform,
        ghost_post_id: ghostPostId,
        status: 'draft',
      });
      setCurrentDraftId(draft.id);
      Alert.alert('Success', 'Draft saved successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to save draft');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please add a title before publishing');
      return;
    }
    // Set initial status based on whether we're updating
    setPublishStatus(ghostPostStatus || 'draft');
    setShowPublishOptions(true);
  };

  const handlePickFeaturedImage = async () => {
    try {
      const result = await pickImageFromGallery();
      if (result && result.uri) {
        setFeaturedImage(result.uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const executePublish = async () => {
    setPublishing(true);
    setShowPublishOptions(false);

    const isUpdate = !!ghostPostId;
    const platformLabel = activePlatform === 'wordpress' ? 'WordPress' : 'Ghost';

    try {
      let result;

      if (isUpdate) {
        // Update existing post with tags
        result = await updatePostOnPlatform(ghostPostId, {
          title,
          content,
          status: publishStatus,
          tags: selectedTags,
          feature_image: featuredImage,
        });
      } else {
        // Create new post with tags
        result = await createPostOnPlatform(title, content, publishStatus, {
          tags: selectedTags,
          feature_image: featuredImage,
        });
      }

      Alert.alert(
        'Success',
        isUpdate
          ? `Post updated on ${platformLabel}!`
          : `Post created on ${platformLabel}! Slug: ${result.slug || 'N/A'}`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', error.message || `Failed to ${isUpdate ? 'update' : 'publish'}`);
    } finally {
      setPublishing(false);
    }
  };

  // ... (insertTemplate, renderTemplateModal unchanged)

  const insertTemplate = (template) => {
    // Append template HTML to content
    const newContent = content + '\n\n' + template.template;
    setContent(newContent);
    setShowTemplates(false);
  };

  const renderTemplateModal = () => (
    <Modal
      visible={showTemplates}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowTemplates(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>HTML Templates</Text>
            <TouchableOpacity
              onPress={() => setShowTemplates(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.templateList}>
            {htmlTemplates.map((template) => (
              <Card
                key={template.id}
                style={styles.templateCard}
                onPress={() => insertTemplate(template)}
              >
                <View style={styles.templateHeader}>
                  <View style={styles.templateIconContainer}>
                    <Ionicons
                      name={
                        template.category === 'visualization'
                          ? 'bar-chart-outline'
                          : template.category === 'stats'
                            ? 'stats-chart-outline'
                            : 'code-outline'
                      }
                      size={22}
                      color={colors.accent}
                    />
                  </View>
                  <View style={styles.templateInfo}>
                    <Text style={styles.templateName}>{template.name}</Text>
                    <Text style={styles.templateDescription}>
                      {template.description}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={colors.text.tertiary}
                  />
                </View>
              </Card>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderPublishOptionsModal = () => {
    const isUpdate = !!ghostPostId;
    const platformLabel = activePlatform === 'wordpress' ? 'WordPress' : 'Ghost';

    return (
      <Modal
        visible={showPublishOptions}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPublishOptions(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.publishModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isUpdate ? 'Update Post' : 'Publish Post'}
              </Text>
              <TouchableOpacity
                onPress={() => setShowPublishOptions(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.publishOptionsScroll}
              keyboardShouldPersistTaps="handled"
            >
              {/* Platform indicator */}
              <View style={styles.publishSection}>
                <View style={styles.platformIndicator}>
                  <Ionicons
                    name={activePlatform === 'wordpress' ? 'logo-wordpress' : 'newspaper-outline'}
                    size={20}
                    color={colors.accent}
                  />
                  <Text style={styles.platformLabel}>Publishing to {platformLabel}</Text>
                </View>
              </View>

              {/* Featured Image Section */}
              <View style={styles.publishSection}>
                <Text style={styles.publishSectionLabel}>Featured Image</Text>
                <TouchableOpacity onPress={handlePickFeaturedImage} style={styles.featuredImageSelector}>
                  {featuredImage ? (
                    <Image source={{ uri: featuredImage }} style={styles.featuredImagePreview} />
                  ) : (
                    <View style={styles.featuredImagePlaceholder}>
                      <Ionicons name="image-outline" size={32} color={colors.text.tertiary} />
                      <Text style={styles.featuredImageText}>Tap to add cover image</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {/* Status selector */}
              <View style={styles.publishSection}>
                <Text style={styles.publishSectionLabel}>Post Status</Text>
                <View style={styles.statusOptions}>
                  <TouchableOpacity
                    style={[
                      styles.statusOption,
                      publishStatus === 'draft' && styles.statusOptionActive,
                    ]}
                    onPress={() => setPublishStatus('draft')}
                  >
                    <Ionicons
                      name="document-outline"
                      size={18}
                      color={publishStatus === 'draft' ? colors.accent : colors.text.tertiary}
                    />
                    <Text style={[
                      styles.statusOptionText,
                      publishStatus === 'draft' && styles.statusOptionTextActive,
                    ]}>
                      Draft
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.statusOption,
                      publishStatus === 'published' && styles.statusOptionActive,
                    ]}
                    onPress={() => setPublishStatus('published')}
                  >
                    <Ionicons
                      name="globe-outline"
                      size={18}
                      color={publishStatus === 'published' ? colors.accent : colors.text.tertiary}
                    />
                    <Text style={[
                      styles.statusOptionText,
                      publishStatus === 'published' && styles.statusOptionTextActive,
                    ]}>
                      Published
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Tags section */}
              <View style={styles.publishSection}>
                <Text style={styles.publishSectionLabel}>Tags</Text>
                <TagSelector
                  selectedTags={selectedTags}
                  onTagsChange={setSelectedTags}
                  placeholder="Search or add tags..."
                  maxTags={10}
                />
              </View>
            </ScrollView>

            {/* Action buttons */}
            <View style={styles.publishActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowPublishOptions(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmPublishButton, publishing && styles.confirmPublishButtonDisabled]}
                onPress={executePublish}
                disabled={publishing}
              >
                <Text style={styles.confirmPublishButtonText}>
                  {publishing ? 'Publishing...' : (isUpdate ? 'Update' : 'Publish')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  };

  const [wordCount, setWordCount] = useState(0);

  const countWords = (str) => {
    if (!str) return 0;
    const text = str.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return text.length > 0 ? text.split(' ').length : 0;
  };

  const renderMenuModal = () => (
    <Modal
      visible={showMenu}
      animationType="fade"
      transparent={true}
      onRequestClose={() => setShowMenu(false)}
    >
      <TouchableOpacity
        style={styles.menuOverlay}
        activeOpacity={1}
        onPress={() => setShowMenu(false)}
      >
        <View style={styles.menuContent}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              setShowMenu(false);
              handleSaveDraft();
            }}
          >
            <Ionicons name="save-outline" size={20} color={colors.text.primary} />
            <Text style={styles.menuItemText}>Save Draft</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              setShowMenu(false);
              setShowPublishOptions(true);
            }}
          >
            <Ionicons name="globe-outline" size={20} color={colors.text.primary} />
            <Text style={styles.menuItemText}>Publish</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              setShowMenu(false);
              setShowTemplates(true);
            }}
          >
            <Ionicons name="code-outline" size={20} color={colors.text.primary} />
            <Text style={styles.menuItemText}>Insert Template</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              setShowMenu(false);
              handlePickFeaturedImage();
            }}
          >
            <Ionicons name="image-outline" size={20} color={colors.text.primary} />
            <Text style={styles.menuItemText}>Set Featured Image</Text>
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              setShowMenu(false);
              Alert.alert(
                'Discard Draft',
                'Are you sure you want to discard this draft?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Discard',
                    style: 'destructive',
                    onPress: () => navigation.goBack()
                  },
                ]
              );
            }}
          >
            <Ionicons name="trash-outline" size={20} color={colors.error || '#FF3B30'} />
            <Text style={[styles.menuItemText, { color: colors.error || '#FF3B30' }]}>Discard</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  // Auto-save timer ref
  const autoSaveTimerRef = useRef(null);

  const handleContentChange = useCallback((html) => {
    setContent(html);
    setWordCount(countWords(html));

    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Set new timer for auto-save (save after 2 seconds of no typing)
    autoSaveTimerRef.current = setTimeout(async () => {
      if (html.trim() || title.trim()) {
        try {
          const draft = await saveDraft({
            id: currentDraftId,
            title,
            content: html,
            featured_image: featuredImage,
            tags: selectedTags,
            platform: activePlatform,
            ghost_post_id: ghostPostId,
            status: 'draft',
          });
          setCurrentDraftId(draft.id);
          console.log('Auto-saved draft');
        } catch (error) {
          console.error('Auto-save failed:', error);
        }
      }
    }, 2000);
  }, [title, featuredImage, selectedTags, activePlatform, ghostPostId, currentDraftId]);

  // Auto-save on title change
  useEffect(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    if (title.trim() || content.trim()) {
      autoSaveTimerRef.current = setTimeout(async () => {
        try {
          const draft = await saveDraft({
            id: currentDraftId,
            title,
            content,
            featured_image: featuredImage,
            tags: selectedTags,
            platform: activePlatform,
            ghost_post_id: ghostPostId,
            status: 'draft',
          });
          setCurrentDraftId(draft.id);
          console.log('Auto-saved draft (title change)');
        } catch (error) {
          console.error('Auto-save failed:', error);
        }
      }, 2000);
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [title, content, featuredImage, selectedTags, activePlatform, ghostPostId, currentDraftId]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Radical Minimalist Header - Single Line */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => setShowMenu(true)}
          style={styles.headerButton}
        >
          <Ionicons name="ellipsis-vertical" size={24} color={colors.text.primary} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          {wordCount} words
        </Text>
      </View>

      {/* Editor Area - Full Screen Edge-to-Edge */}
      <View style={styles.editorContainer}>
        {/* Title Input as part of the canvas */}
        <TextInput
          style={styles.titleInput}
          placeholder="Title"
          placeholderTextColor={colors.text.tertiary}
          value={title}
          onChangeText={setTitle}
          multiline
          scrollEnabled={false}
        />

        <RichTextEditor
          ref={editorRef}
          initialContent={content}
          onContentChange={handleContentChange}
          placeholder="Start writing..."
          minHeight="100%"
        />
      </View>

      {renderMenuModal()}
      {renderTemplateModal()}
      {renderPublishOptionsModal()}
    </KeyboardAvoidingView>
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
    paddingTop: (Platform?.OS === 'android') ? ((StatusBar?.currentHeight || 24) + 4) : spacing.sm,
    paddingBottom: spacing.xs,
    backgroundColor: colors.background,
  },
  // ... (rest of styles preserved from view, adding featuredImage styles)
  featuredImageSelector: {
    height: 150,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  featuredImagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  featuredImagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  featuredImageText: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
  },
  headerTitle: {
    fontSize: 13,
    color: '#8E8E93', // Specific requirement
    fontWeight: '500',
    opacity: 0.8,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Editor
  editorContainer: {
    flex: 1,
    paddingHorizontal: 16, // "Add significant padding to the left/right (16dp)"
  },
  titleInput: {
    fontSize: 24, // H1 equivalent
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
    fontFamily: (Platform?.OS === 'ios') ? 'System' : 'Roboto',
    padding: 0,
  },
  // Modals... (reuse existing or simplify)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  // ... rest of modal styles
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '80%',
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  templateList: {
    padding: spacing.md,
  },
  templateCard: {
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  templateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  templateIconContainer: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: `${colors.accent}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  templateInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  templateName: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  templateDescription: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    lineHeight: typography.sizes.sm * 1.4,
  },
  // Publish Options Modal styles
  publishModalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '85%',
    ...shadows.lg,
  },
  publishOptionsScroll: {
    paddingHorizontal: spacing.lg,
    maxHeight: 400,
  },
  publishSection: {
    marginBottom: spacing.lg,
  },
  publishSectionLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  platformIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    backgroundColor: `${colors.accent}10`,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  platformLabel: {
    fontSize: typography.sizes.sm,
    color: colors.accent,
    fontWeight: typography.weights.medium,
  },
  statusOptions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statusOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  statusOptionActive: {
    backgroundColor: `${colors.accent}10`,
    borderColor: colors.accent,
  },
  statusOptionText: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
    fontWeight: typography.weights.medium,
  },
  statusOptionTextActive: {
    color: colors.accent,
  },
  publishActions: {
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
    fontWeight: typography.weights.medium,
  },
  confirmPublishButton: {
    flex: 2,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmPublishButtonDisabled: {
    backgroundColor: colors.text.tertiary,
  },
  confirmPublishButtonText: {
    fontSize: typography.sizes.base,
    color: colors.text.inverse,
    fontWeight: typography.weights.semibold,
  },
  // Menu styles
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: (Platform?.OS === 'android') ? ((StatusBar?.currentHeight || 24) + 50) : 90,
    paddingRight: spacing.md,
  },
  menuContent: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    minWidth: 200,
    ...shadows.lg,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  menuItemText: {
    fontSize: typography.sizes.base,
    color: colors.text.primary,
    fontWeight: typography.weights.medium,
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
});
