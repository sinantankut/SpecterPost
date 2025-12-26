/**
 * API Service
 *
 * "Specter" Architecture: Unified API layer for Ghost and WordPress.
 * All communication happens directly with CMS APIs - no middleware required.
 *
 * JWT tokens for Ghost are signed locally using jose.
 * WordPress uses Basic Auth with Application Passwords.
 */

import { getGhostCredentials, getActivePlatform as getActivePlatformFromStorage } from './storage';
import { validateGhostAdminKey, validateGhostUrl } from './authService';
import {
  fetchPosts,
  fetchPostById,
  createPost,
  updatePost,
  deletePost,
  uploadImage,
  uploadMedia,
  testConnection,
  clearTokenCache,
  fetchTags,
  createTag,
  searchTags,
  prepareTags,
  getSiteInfo,
} from './ghostService';
import * as wordpressService from './wordpressService';

// Re-export utilities for use in components
export const getActivePlatform = getActivePlatformFromStorage;
export { fetchTags, createTag, searchTags, prepareTags } from './ghostService';

/**
 * Fetch posts from Ghost CMS
 * @param {Object} options - { limit, page, status, visibility, featured, order }
 */
export const fetchGhostPosts = async (options = {}) => {
  return fetchPosts(options);
};

/**
 * Fetch a single post from Ghost CMS by ID
 * @param {string} postId - Post ID or slug
 * @param {Object} options - { bySlug: boolean }
 */
export const fetchGhostPostById = async (postId, options = {}) => {
  return fetchPostById(postId, options);
};

/**
 * Update an existing post in Ghost CMS
 * @param {string} postId - Post ID
 * @param {Object} updates - Fields to update (title, content, status, tags, feature_image, etc.)
 */
export const updateGhostPost = async (postId, updates) => {
  return updatePost(postId, updates);
};

/**
 * Publish/create a new post to Ghost CMS
 * @param {string} title - Post title
 * @param {string} content - HTML content
 * @param {string} status - Post status (draft, published, scheduled)
 * @param {Object} options - Additional options (tags, feature_image, custom_excerpt, etc.)
 */
export const publishToGhost = async (title, content, status = 'draft', options = {}) => {
  return createPost(title, content, status, options);
};

/**
 * Delete a post from Ghost CMS
 */
export const deleteGhostPost = async (postId) => {
  return deletePost(postId);
};

/**
 * Upload an image to Ghost CMS
 * @param {string} imageUri - Local image URI
 * @param {string} filename - Desired filename
 * @param {string} purpose - 'image', 'profile_image', or 'icon'
 */
export const uploadImageToGhost = async (imageUri, filename, purpose = 'image') => {
  return uploadImage(imageUri, filename, purpose);
};

/**
 * Upload media (video/audio) to Ghost CMS
 * @param {string} mediaUri - Local media URI
 * @param {string} filename - Desired filename
 */
export const uploadMediaToGhost = async (mediaUri, filename) => {
  return uploadMedia(mediaUri, filename);
};

/**
 * Get Ghost site information
 */
export const getGhostSiteInfo = async () => {
  return getSiteInfo();
};

/**
 * Test connection to Ghost CMS
 * Validates credentials and connectivity directly - no middleware required
 */
export const testGhostConnection = async (ghostUrl, adminKey) => {
  try {
    // Validate URL format
    const urlValidation = validateGhostUrl(ghostUrl);
    if (!urlValidation.valid) {
      return { success: false, error: urlValidation.error };
    }

    // Validate admin key format
    const keyValidation = validateGhostAdminKey(adminKey);
    if (!keyValidation.valid) {
      return { success: false, error: keyValidation.error };
    }

    // Clear any cached token before testing
    clearTokenCache();

    // Test actual Ghost connection by fetching posts
    return testConnection();
  } catch (error) {
    return { success: false, error: error.message || 'Connection failed' };
  }
};

/**
 * Test connection to WordPress
 */
export const testWordPressConnection = async () => {
  return wordpressService.testConnection();
};

/**
 * Get posts from the active platform
 * @param {Object} options - { limit, page, status }
 */
export const getPosts = async (options = {}) => {
  const platform = await getActivePlatform();

  if (platform === 'wordpress') {
    return wordpressService.fetchPosts(options);
  }

  return fetchPosts(options);
};

/**
 * Get a single post from the active platform
 * @param {string} postId - Post ID
 * @param {Object} options - Additional options (bySlug for Ghost)
 */
export const getPostById = async (postId, options = {}) => {
  const platform = await getActivePlatform();

  if (platform === 'wordpress') {
    return wordpressService.fetchPostById(postId);
  }

  return fetchPostById(postId, options);
};

/**
 * Create a post on the active platform
 *
 * @param {string} title - Post title
 * @param {string} content - HTML content
 * @param {string} status - Post status (draft, published)
 * @param {Object} options - Additional options for Ghost:
 *   - tags: Array of tag names or objects
 *   - feature_image: Featured image URL
 *   - feature_image_alt: Alt text for featured image
 *   - custom_excerpt: Custom excerpt
 *   - visibility: 'public', 'members', 'paid'
 *   - featured: Boolean
 *   - meta_title: SEO title
 *   - meta_description: SEO description
 */
export const createPostOnPlatform = async (title, content, status = 'draft', options = {}) => {
  const platform = await getActivePlatform();

  if (platform === 'wordpress') {
    // WordPress doesn't support all Ghost options, but we can pass what's available
    return wordpressService.createPost(title, content, status);
  }

  // Handle auto-upload of featured image for Ghost
  if (options.feature_image && (options.feature_image.startsWith('file://') || options.feature_image.startsWith('content://'))) {
    try {
      const filename = options.feature_image.split('/').pop() || 'featured-image.jpg';
      const uploadedUrl = await uploadImage(options.feature_image, filename);
      options.feature_image = uploadedUrl;
    } catch (error) {
      console.error('Failed to auto-upload featured image:', error);
      // Continue without image or throw? 
      // Better to fail distinctively or just warn. warning for now.
    }
  }

  return createPost(title, content, status, options);
};

export const updatePostOnPlatform = async (postId, updates) => {
  const platform = await getActivePlatform();

  if (platform === 'wordpress') {
    // WordPress uses positional args, extract what we need
    return wordpressService.updatePost(
      postId,
      updates.title,
      updates.content,
      updates.status
    );
  }

  // Handle auto-upload of featured image for Ghost
  if (updates.feature_image && (updates.feature_image.startsWith('file://') || updates.feature_image.startsWith('content://'))) {
    try {
      const filename = updates.feature_image.split('/').pop() || 'featured-image.jpg';
      const uploadedUrl = await uploadImage(updates.feature_image, filename);
      updates.feature_image = uploadedUrl;
    } catch (error) {
      console.error('Failed to auto-upload featured image:', error);
    }
  }

  return updatePost(postId, updates);
};

/**
 * Delete a post from the active platform
 */
export const deletePostFromPlatform = async (postId) => {
  const platform = await getActivePlatform();

  if (platform === 'wordpress') {
    return wordpressService.deletePost(postId);
  }

  return deletePost(postId);
};

/**
 * Upload media to the active platform
 * @param {string} mediaUri - Local file URI
 * @param {string} filename - Desired filename
 * @param {string} mediaType - 'image' or 'video' (for Ghost)
 */
export const uploadMediaToPlatform = async (mediaUri, filename, mediaType = 'image') => {
  const platform = await getActivePlatform();

  if (platform === 'wordpress') {
    return wordpressService.uploadMedia(mediaUri, filename);
  }

  // Ghost has separate endpoints for images vs media
  if (mediaType === 'video' || mediaType === 'audio') {
    return uploadMedia(mediaUri, filename);
  }

  return uploadImage(mediaUri, filename);
};

/**
 * Get tags from the active platform
 * Note: WordPress tag handling differs, this primarily supports Ghost
 */
export const getTags = async (options = {}) => {
  const platform = await getActivePlatform();

  if (platform === 'wordpress') {
    // WordPress would need a separate implementation
    // For now, return empty for WordPress
    return { tags: [] };
  }

  return fetchTags(options);
};

/**
 * Search for tags (for autocomplete in editor)
 * @param {string} query - Search query
 */
export const searchTagsOnPlatform = async (query) => {
  const platform = await getActivePlatform();

  if (platform === 'wordpress') {
    return { tags: [] };
  }

  return searchTags(query);
};
