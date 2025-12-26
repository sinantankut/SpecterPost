/**
 * Ghost Service - Direct API Communication
 *
 * "Specter" Architecture: Communicate directly with Ghost Admin API.
 * JWT tokens are signed locally using jose - no middleware required.
 *
 * Based on Ghost Admin API response structure from Postman testing.
 */

import { getGhostCredentials } from './storage';
import { getGhostToken, clearGhostTokenCache } from './authService';

/**
 * Build Lexical document format required by Ghost 5.0+
 * Wraps HTML content in Lexical JSON structure
 */
const buildLexicalDocument = (htmlContent) => {
  return JSON.stringify({
    root: {
      children: [
        {
          type: 'html',
          version: 1,
          html: htmlContent || ''
        }
      ],
      direction: null,
      format: '',
      indent: 0,
      type: 'root',
      version: 1
    }
  });
};

/**
 * Get a valid Ghost API token
 * Tokens are signed locally using jose - no middleware required
 */
const getToken = async () => {
  const { adminKey } = await getGhostCredentials();

  if (!adminKey) {
    throw new Error('Ghost credentials not configured. Please set them in Settings.');
  }

  return getGhostToken(adminKey);
};

/**
 * Clear the cached token (useful when credentials change)
 * Re-exported from authService for backward compatibility
 */
export const clearTokenCache = clearGhostTokenCache;

/**
 * Get the Ghost API base URL
 */
const getGhostApiUrl = async () => {
  const { ghostUrl } = await getGhostCredentials();

  if (!ghostUrl) {
    throw new Error('Ghost URL not configured. Please set it in Settings.');
  }

  // Normalize URL (remove trailing slash)
  return ghostUrl.replace(/\/$/, '');
};

/**
 * Make an authenticated request to Ghost Admin API
 */
const ghostApiRequest = async (endpoint, options = {}) => {
  const token = await getToken();
  const baseUrl = await getGhostApiUrl();

  const url = `${baseUrl}/ghost/api/admin${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Ghost ${token}`,
      'Content-Type': 'application/json',
      'Accept-Version': 'v5.0',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.errors?.[0]?.message || `Ghost API error: ${response.status}`;
    throw new Error(errorMessage);
  }

  // DELETE requests may not return JSON
  if (options.method === 'DELETE') {
    return { success: true };
  }

  return response.json();
};

/**
 * Map a Ghost post response to our app's post structure
 * Includes all fields from the Ghost Admin API
 */
const mapPost = (post) => ({
  // Core identifiers
  id: post.id,
  uuid: post.uuid,
  slug: post.slug,
  comment_id: post.comment_id,

  // Content
  title: post.title,
  html: post.html,
  lexical: post.lexical,
  excerpt: post.excerpt || '',
  custom_excerpt: post.custom_excerpt,
  reading_time: post.reading_time,

  // Status & visibility
  status: post.status,
  visibility: post.visibility,
  featured: post.featured,
  access: post.access,
  comments: post.comments,

  // Feature image
  feature_image: post.feature_image,
  feature_image_alt: post.feature_image_alt,
  feature_image_caption: post.feature_image_caption,

  // Timestamps
  created_at: post.created_at,
  updated_at: post.updated_at,
  published_at: post.published_at,

  // URL
  url: post.url,
  canonical_url: post.canonical_url,

  // SEO & Meta
  meta_title: post.meta_title,
  meta_description: post.meta_description,
  og_image: post.og_image,
  og_title: post.og_title,
  og_description: post.og_description,
  twitter_image: post.twitter_image,
  twitter_title: post.twitter_title,
  twitter_description: post.twitter_description,

  // Code injection
  codeinjection_head: post.codeinjection_head,
  codeinjection_foot: post.codeinjection_foot,

  // Template & frontmatter
  custom_template: post.custom_template,
  frontmatter: post.frontmatter,

  // Email
  email_subject: post.email_subject,

  // Relations (when included)
  tags: post.tags || [],
  authors: post.authors || [],
  primary_author: post.primary_author,
  primary_tag: post.primary_tag,
});

/**
 * Fetch all posts from Ghost
 *
 * @param {Object} options - Query options
 * @param {number} options.limit - Number of posts (default: 15)
 * @param {number} options.page - Page number (default: 1)
 * @param {string} options.status - Filter by status: draft, published, scheduled, all
 * @param {string} options.visibility - Filter by visibility: public, members, paid
 * @param {boolean} options.featured - Filter featured posts only
 * @param {string} options.order - Sort order (default: updated_at desc)
 */
export const fetchPosts = async (options = {}) => {
  const params = new URLSearchParams({
    limit: options.limit?.toString() || '15',
    page: options.page?.toString() || '1',
    include: 'tags,authors',
    formats: 'html',
    order: options.order || 'updated_at desc',
  });

  // Build filter string
  const filters = [];

  if (options.status && options.status !== 'all') {
    filters.push(`status:${options.status}`);
  }

  if (options.visibility) {
    filters.push(`visibility:${options.visibility}`);
  }

  if (options.featured !== undefined) {
    filters.push(`featured:${options.featured}`);
  }

  if (filters.length > 0) {
    params.append('filter', filters.join('+'));
  }

  const data = await ghostApiRequest(`/posts/?${params.toString()}`);

  return {
    posts: data.posts.map(mapPost),
    meta: data.meta,
  };
};

/**
 * Fetch a single post by ID
 *
 * @param {string} postId - Post ID or slug
 * @param {Object} options - Query options
 * @param {boolean} options.bySlug - If true, fetch by slug instead of ID
 */
export const fetchPostById = async (postId, options = {}) => {
  const endpoint = options.bySlug
    ? `/posts/slug/${postId}/?formats=html,lexical&include=tags,authors`
    : `/posts/${postId}/?formats=html,lexical&include=tags,authors`;

  const data = await ghostApiRequest(endpoint);
  const post = data.posts[0];

  return {
    post: mapPost(post),
  };
};

/**
 * Create a new post in Ghost
 *
 * @param {string} title - Post title
 * @param {string} content - HTML content
 * @param {string} status - Post status: draft, published, scheduled (default: draft)
 * @param {Object} options - Additional post options
 * @param {string} options.feature_image - Featured image URL
 * @param {string} options.feature_image_alt - Featured image alt text
 * @param {string} options.feature_image_caption - Featured image caption
 * @param {string} options.custom_excerpt - Custom excerpt
 * @param {string} options.visibility - Visibility: public, members, paid (default: public)
 * @param {boolean} options.featured - Mark as featured
 * @param {string} options.slug - Custom slug
 * @param {string} options.canonical_url - Canonical URL
 * @param {string} options.meta_title - SEO title
 * @param {string} options.meta_description - SEO description
 * @param {Array} options.tags - Array of tag objects or names
 * @param {string} options.published_at - Schedule publish time (for scheduled status)
 */
export const createPost = async (title, content, status = 'draft', options = {}) => {
  const lexicalString = buildLexicalDocument(content);

  const postData = {
    title,
    lexical: lexicalString,
    status,
  };

  // Add optional fields if provided
  if (options.feature_image) postData.feature_image = options.feature_image;
  if (options.feature_image_alt) postData.feature_image_alt = options.feature_image_alt;
  if (options.feature_image_caption) postData.feature_image_caption = options.feature_image_caption;
  if (options.custom_excerpt) postData.custom_excerpt = options.custom_excerpt;
  if (options.visibility) postData.visibility = options.visibility;
  if (options.featured !== undefined) postData.featured = options.featured;
  if (options.slug) postData.slug = options.slug;
  if (options.canonical_url) postData.canonical_url = options.canonical_url;
  if (options.meta_title) postData.meta_title = options.meta_title;
  if (options.meta_description) postData.meta_description = options.meta_description;
  if (options.published_at) postData.published_at = options.published_at;

  // Handle tags - can be array of strings or tag objects
  if (options.tags && options.tags.length > 0) {
    postData.tags = options.tags.map(tag =>
      typeof tag === 'string' ? { name: tag } : tag
    );
  }

  const payload = { posts: [postData] };

  const data = await ghostApiRequest('/posts/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  const post = data.posts[0];

  return {
    success: true,
    post: mapPost(post),
  };
};

/**
 * Update an existing post in Ghost
 *
 * @param {string} postId - Post ID
 * @param {Object} updates - Fields to update
 * @param {string} updates.title - Post title
 * @param {string} updates.content - HTML content (will be converted to Lexical)
 * @param {string} updates.status - Post status
 * @param {string} updates.feature_image - Featured image URL
 * @param {string} updates.feature_image_alt - Featured image alt text
 * @param {string} updates.feature_image_caption - Featured image caption
 * @param {string} updates.custom_excerpt - Custom excerpt
 * @param {string} updates.visibility - Visibility
 * @param {boolean} updates.featured - Mark as featured
 * @param {string} updates.slug - Custom slug
 * @param {string} updates.canonical_url - Canonical URL
 * @param {string} updates.meta_title - SEO title
 * @param {string} updates.meta_description - SEO description
 * @param {Array} updates.tags - Array of tags
 */
export const updatePost = async (postId, updates = {}) => {
  // First, fetch the current post to get updated_at for conflict resolution
  const currentData = await ghostApiRequest(`/posts/${postId}/`);
  const currentPost = currentData.posts[0];

  const postData = {
    updated_at: currentPost.updated_at, // Required for conflict resolution
  };

  // Handle content update
  if (updates.title !== undefined) postData.title = updates.title;
  if (updates.content !== undefined) {
    postData.lexical = buildLexicalDocument(updates.content);
  }
  if (updates.status !== undefined) postData.status = updates.status;

  // Optional fields
  if (updates.feature_image !== undefined) postData.feature_image = updates.feature_image;
  if (updates.feature_image_alt !== undefined) postData.feature_image_alt = updates.feature_image_alt;
  if (updates.feature_image_caption !== undefined) postData.feature_image_caption = updates.feature_image_caption;
  if (updates.custom_excerpt !== undefined) postData.custom_excerpt = updates.custom_excerpt;
  if (updates.visibility !== undefined) postData.visibility = updates.visibility;
  if (updates.featured !== undefined) postData.featured = updates.featured;
  if (updates.slug !== undefined) postData.slug = updates.slug;
  if (updates.canonical_url !== undefined) postData.canonical_url = updates.canonical_url;
  if (updates.meta_title !== undefined) postData.meta_title = updates.meta_title;
  if (updates.meta_description !== undefined) postData.meta_description = updates.meta_description;

  // Handle tags
  if (updates.tags !== undefined) {
    postData.tags = updates.tags.map(tag =>
      typeof tag === 'string' ? { name: tag } : tag
    );
  }

  const payload = { posts: [postData] };

  const data = await ghostApiRequest(`/posts/${postId}/`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

  const post = data.posts[0];

  return {
    success: true,
    post: mapPost(post),
  };
};

/**
 * Backward-compatible update function
 * Accepts (postId, title, content, status) signature
 */
export const updatePostLegacy = async (postId, title, content, status) => {
  return updatePost(postId, { title, content, status });
};

/**
 * Delete a post from Ghost
 *
 * @param {string} postId - Post ID
 */
export const deletePost = async (postId) => {
  await ghostApiRequest(`/posts/${postId}/`, {
    method: 'DELETE',
  });

  return {
    success: true,
    message: 'Post deleted successfully',
  };
};

/**
 * Upload an image directly to Ghost
 *
 * @param {string} imageUri - Local image URI
 * @param {string} filename - Desired filename
 * @param {string} purpose - Upload purpose: 'image', 'profile_image', 'icon' (default: 'image')
 */
export const uploadImage = async (imageUri, filename, purpose = 'image') => {
  const token = await getToken();
  const baseUrl = await getGhostApiUrl();

  // Determine mime type from filename
  const ext = (filename || 'image.jpg').split('.').pop()?.toLowerCase();
  const mimeTypes = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
  };
  const mimeType = mimeTypes[ext] || 'image/jpeg';

  // Create form data for file upload
  const formData = new FormData();
  formData.append('file', {
    uri: imageUri,
    type: mimeType,
    name: filename || 'image.jpg',
  });
  formData.append('purpose', purpose);

  const response = await fetch(`${baseUrl}/ghost/api/admin/images/upload/`, {
    method: 'POST',
    headers: {
      'Authorization': `Ghost ${token}`,
      'Accept-Version': 'v5.0',
      // Don't set Content-Type - let fetch set it with boundary for FormData
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.errors?.[0]?.message || 'Failed to upload image');
  }

  const data = await response.json();

  return {
    success: true,
    url: data.images[0].url,
  };
};

/**
 * Upload media (video/audio) directly to Ghost
 *
 * @param {string} mediaUri - Local media URI
 * @param {string} filename - Desired filename
 */
export const uploadMedia = async (mediaUri, filename) => {
  const token = await getToken();
  const baseUrl = await getGhostApiUrl();

  // Determine mime type from filename
  const ext = (filename || 'video.mp4').split('.').pop()?.toLowerCase();
  const mimeTypes = {
    mp4: 'video/mp4',
    webm: 'video/webm',
    ogv: 'video/ogg',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    m4a: 'audio/mp4',
  };
  const mimeType = mimeTypes[ext] || 'video/mp4';

  const formData = new FormData();
  formData.append('file', {
    uri: mediaUri,
    type: mimeType,
    name: filename || 'video.mp4',
  });

  const response = await fetch(`${baseUrl}/ghost/api/admin/media/upload/`, {
    method: 'POST',
    headers: {
      'Authorization': `Ghost ${token}`,
      'Accept-Version': 'v5.0',
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.errors?.[0]?.message || 'Failed to upload media');
  }

  const data = await response.json();

  return {
    success: true,
    url: data.media[0].url,
  };
};

/**
 * Map a Ghost tag response to our app's tag structure
 * Based on Ghost Content API response
 */
const mapTag = (tag) => ({
  id: tag.id,
  name: tag.name,
  slug: tag.slug,
  description: tag.description,
  feature_image: tag.feature_image,
  visibility: tag.visibility,
  url: tag.url,
  accent_color: tag.accent_color,
  // SEO fields
  meta_title: tag.meta_title,
  meta_description: tag.meta_description,
  og_image: tag.og_image,
  og_title: tag.og_title,
  og_description: tag.og_description,
  twitter_image: tag.twitter_image,
  twitter_title: tag.twitter_title,
  twitter_description: tag.twitter_description,
  // Code injection
  codeinjection_head: tag.codeinjection_head,
  codeinjection_foot: tag.codeinjection_foot,
  canonical_url: tag.canonical_url,
  // Count (when available)
  count: tag.count,
});

/**
 * Fetch all tags from Ghost
 *
 * @param {Object} options - Query options
 * @param {number|string} options.limit - Number of tags or 'all' (default: 'all')
 * @param {string} options.order - Sort order (default: 'name asc')
 * @param {string} options.filter - Filter expression
 */
export const fetchTags = async (options = {}) => {
  const params = new URLSearchParams({
    limit: options.limit?.toString() || 'all',
    order: options.order || 'name asc',
  });

  if (options.filter) {
    params.append('filter', options.filter);
  }

  // Include count of posts per tag
  params.append('include', 'count.posts');

  const data = await ghostApiRequest(`/tags/?${params.toString()}`);

  return {
    tags: data.tags.map(mapTag),
    meta: data.meta,
  };
};

/**
 * Create a new tag in Ghost
 *
 * @param {Object} tagData - Tag data
 * @param {string} tagData.name - Tag name (required)
 * @param {string} tagData.slug - Custom slug (optional, auto-generated from name)
 * @param {string} tagData.description - Tag description
 * @param {string} tagData.feature_image - Tag image URL
 * @param {string} tagData.visibility - 'public' or 'internal' (default: 'public')
 * @param {string} tagData.accent_color - Hex color code
 */
export const createTag = async (tagData) => {
  const payload = {
    tags: [{
      name: tagData.name,
      ...(tagData.slug && { slug: tagData.slug }),
      ...(tagData.description && { description: tagData.description }),
      ...(tagData.feature_image && { feature_image: tagData.feature_image }),
      ...(tagData.visibility && { visibility: tagData.visibility }),
      ...(tagData.accent_color && { accent_color: tagData.accent_color }),
    }],
  };

  const data = await ghostApiRequest('/tags/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return {
    success: true,
    tag: mapTag(data.tags[0]),
  };
};

/**
 * Search tags by name (for autocomplete)
 *
 * @param {string} query - Search query
 * @param {number} limit - Max results (default: 10)
 */
export const searchTags = async (query, limit = 10) => {
  if (!query || query.length < 1) {
    return { tags: [] };
  }

  const params = new URLSearchParams({
    limit: limit.toString(),
    filter: `name:~'${query}'`,
    order: 'name asc',
  });

  try {
    const data = await ghostApiRequest(`/tags/?${params.toString()}`);
    return {
      tags: data.tags.map(mapTag),
    };
  } catch (error) {
    // If search fails, return empty (tag might not exist yet)
    return { tags: [] };
  }
};

/**
 * Helper to prepare tags for post creation/update
 * Accepts mixed array of tag names (strings) or tag objects
 *
 * @param {Array} tags - Array of tag names or objects
 * @returns {Array} Formatted tags for Ghost API
 *
 * @example
 * prepareTags(['Technology', 'News']) // [{ name: 'Technology' }, { name: 'News' }]
 * prepareTags([{ id: 'abc' }, 'News']) // [{ id: 'abc' }, { name: 'News' }]
 */
export const prepareTags = (tags) => {
  if (!tags || !Array.isArray(tags)) return [];

  return tags.map(tag => {
    if (typeof tag === 'string') {
      return { name: tag };
    }
    // If object with id, use id; otherwise use name or slug
    if (tag.id) {
      return { id: tag.id };
    }
    if (tag.name) {
      return { name: tag.name };
    }
    if (tag.slug) {
      return { slug: tag.slug };
    }
    return tag;
  });
};

/**
 * Test the Ghost connection
 * Attempts to fetch posts to verify credentials work
 */
export const testConnection = async () => {
  try {
    // Clear any cached token to force a fresh test
    clearTokenCache();

    // Try to fetch one post to verify connection
    await fetchPosts({ limit: 1 });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Connection test failed',
    };
  }
};

/**
 * Get site information
 */
export const getSiteInfo = async () => {
  try {
    const data = await ghostApiRequest('/site/');
    return {
      success: true,
      site: data.site,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};
