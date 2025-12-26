/**
 * WordPress Service - Direct API Communication
 *
 * "Specter" Architecture: Communicate directly with WordPress REST API.
 * Uses Basic Auth with Application Passwords.
 */

import { createWordPressAuthHeader } from './authService';
import { getWordPressCredentials } from './storage';

/**
 * Get WordPress API base URL
 */
const getWordPressApiUrl = async () => {
  const { siteUrl } = await getWordPressCredentials();

  if (!siteUrl) {
    throw new Error('WordPress site URL not configured. Please set it in Settings.');
  }

  return siteUrl.replace(/\/$/, '');
};

/**
 * Get WordPress auth header
 */
const getAuthHeader = async () => {
  const { username, appPassword } = await getWordPressCredentials();

  if (!username || !appPassword) {
    throw new Error('WordPress credentials not configured. Please set them in Settings.');
  }

  return createWordPressAuthHeader(username, appPassword);
};

/**
 * Make an authenticated request to WordPress REST API
 */
const wpApiRequest = async (endpoint, options = {}) => {
  const baseUrl = await getWordPressApiUrl();
  const authHeader = await getAuthHeader();

  const url = `${baseUrl}/wp-json/wp/v2${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.message || `WordPress API error: ${response.status}`;
    throw new Error(errorMessage);
  }

  if (options.method === 'DELETE') {
    return { success: true };
  }

  return response.json();
};

/**
 * Fetch posts from WordPress
 */
export const fetchPosts = async (options = {}) => {
  const params = new URLSearchParams({
    per_page: options.limit?.toString() || '15',
    page: options.page?.toString() || '1',
    orderby: 'modified',
    order: 'desc',
    context: 'edit', // Get full content including drafts
  });

  // Handle status filter
  if (options.status && options.status !== 'all') {
    params.append('status', options.status);
  } else {
    // Get all statuses
    params.append('status', 'publish,draft,pending,private');
  }

  const data = await wpApiRequest(`/posts?${params.toString()}`);

  // Map WordPress posts to common format
  const posts = data.map(post => ({
    id: post.id,
    title: post.title?.rendered || post.title?.raw || '',
    slug: post.slug,
    status: post.status,
    excerpt: post.excerpt?.rendered || post.excerpt?.raw || '',
    html: post.content?.rendered || post.content?.raw || '',
    content_raw: post.content?.raw || '',
    created_at: post.date,
    updated_at: post.modified,
    published_at: post.status === 'publish' ? post.date : null,
    url: post.link,
    featured_media: post.featured_media,
  }));

  return {
    posts,
    meta: {
      pagination: {
        page: parseInt(options.page || '1'),
        limit: parseInt(options.limit || '15'),
      },
    },
  };
};

/**
 * Fetch a single post by ID
 */
export const fetchPostById = async (postId) => {
  const data = await wpApiRequest(`/posts/${postId}?context=edit`);

  return {
    post: {
      id: data.id,
      title: data.title?.rendered || data.title?.raw || '',
      slug: data.slug,
      status: data.status,
      excerpt: data.excerpt?.rendered || data.excerpt?.raw || '',
      html: data.content?.rendered || '',
      content_raw: data.content?.raw || '',
      created_at: data.date,
      updated_at: data.modified,
      published_at: data.status === 'publish' ? data.date : null,
      url: data.link,
      featured_media: data.featured_media,
    },
  };
};

/**
 * Create a new post in WordPress
 */
export const createPost = async (title, content, status = 'draft') => {
  const payload = {
    title,
    content,
    status,
  };

  const data = await wpApiRequest('/posts', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return {
    success: true,
    id: data.id,
    slug: data.slug,
    url: data.link,
    status: data.status,
  };
};

/**
 * Update an existing post in WordPress
 */
export const updatePost = async (postId, title, content, status) => {
  const payload = {
    title,
    content,
    status,
  };

  const data = await wpApiRequest(`/posts/${postId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

  return {
    success: true,
    id: data.id,
    slug: data.slug,
    url: data.link,
    status: data.status,
  };
};

/**
 * Delete a post from WordPress
 */
export const deletePost = async (postId, force = false) => {
  // force=true permanently deletes, otherwise moves to trash
  const params = force ? '?force=true' : '';

  await wpApiRequest(`/posts/${postId}${params}`, {
    method: 'DELETE',
  });

  return {
    success: true,
    message: force ? 'Post permanently deleted' : 'Post moved to trash',
  };
};

/**
 * Upload media to WordPress
 */
export const uploadMedia = async (mediaUri, filename, mimeType = 'image/jpeg') => {
  const baseUrl = await getWordPressApiUrl();
  const authHeader = await getAuthHeader();

  const formData = new FormData();
  formData.append('file', {
    uri: mediaUri,
    type: mimeType,
    name: filename || 'upload.jpg',
  });

  const response = await fetch(`${baseUrl}/wp-json/wp/v2/media`, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to upload media');
  }

  const data = await response.json();

  return {
    success: true,
    url: data.source_url,
    id: data.id,
  };
};

/**
 * Test the WordPress connection
 */
export const testConnection = async () => {
  try {
    // Try to fetch user info to verify credentials
    const baseUrl = await getWordPressApiUrl();
    const authHeader = await getAuthHeader();

    const response = await fetch(`${baseUrl}/wp-json/wp/v2/users/me?context=edit`, {
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.message || `Connection failed: ${response.status}`,
      };
    }

    const user = await response.json();

    return {
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Connection test failed',
    };
  }
};

/**
 * Get site info (useful for validation)
 */
export const getSiteInfo = async () => {
  try {
    const baseUrl = await getWordPressApiUrl();

    const response = await fetch(`${baseUrl}/wp-json/`);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    return {
      name: data.name,
      description: data.description,
      url: data.url,
      gmt_offset: data.gmt_offset,
    };
  } catch {
    return null;
  }
};
