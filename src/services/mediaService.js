/**
 * Media Service - Compression and Upload Utilities
 *
 * "Specter" Architecture: Handle media compression and direct uploads
 * without middleware dependency.
 *
 * - Video compression using react-native-compressor
 * - Direct uploads to Ghost and WordPress APIs
 */

import { Video, Image } from 'react-native-compressor';
import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';

// Default compression settings
// Target: 10MB max for videos
const DEFAULT_VIDEO_OPTIONS = {
  compressionMethod: 'manual',
  bitrate: 1500000, // ~1.5 Mbps for better quality, ~10MB for 60s video
  maxSize: 720, // 720p limit
};

const DEFAULT_IMAGE_OPTIONS = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.8,
};

/**
 * Compress a video file
 *
 * @param {string} uri - Video file URI
 * @param {Object} options - Compression options
 * @returns {Promise<{ uri: string, size: number }>}
 */
export const compressVideo = async (uri, options = {}) => {
  try {
    const compressionOptions = {
      ...DEFAULT_VIDEO_OPTIONS,
      ...options,
    };

    const compressedUri = await Video.compress(uri, {
      compressionMethod: compressionOptions.compressionMethod,
      bitrate: compressionOptions.bitrate,
      maxSize: compressionOptions.maxSize,
    });

    // Get compressed file size
    const file = new File(compressedUri);
    const size = file.size;

    return {
      uri: compressedUri,
      size,
      wasCompressed: true,
    };
  } catch (error) {
    console.error('Video compression error:', error);
    throw new Error(`Failed to compress video: ${error.message}`);
  }
};

/**
 * Compress an image using react-native-compressor
 * This is an alternative to the ImageManipulator-based compression
 *
 * @param {string} uri - Image file URI
 * @param {Object} options - Compression options
 * @returns {Promise<{ uri: string, size: number }>}
 */
export const compressImageWithCompressor = async (uri, options = {}) => {
  try {
    const compressionOptions = {
      ...DEFAULT_IMAGE_OPTIONS,
      ...options,
    };

    const compressedUri = await Image.compress(uri, {
      maxWidth: compressionOptions.maxWidth,
      maxHeight: compressionOptions.maxHeight,
      quality: compressionOptions.quality,
    });

    const file = new File(compressedUri);
    const size = file.size;

    return {
      uri: compressedUri,
      size,
      wasCompressed: true,
    };
  } catch (error) {
    console.error('Image compression error:', error);
    throw new Error(`Failed to compress image: ${error.message}`);
  }
};

/**
 * Pick video from device gallery
 *
 * @param {Object} options - Picker options
 * @returns {Promise<Object|null>}
 */
export const pickVideo = async (options = {}) => {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Media library permission denied');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['videos'],
    allowsEditing: options.allowsEditing ?? false,
    quality: 1,
    ...options,
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }

  const asset = result.assets[0];

  // Compress the video
  const compressed = await compressVideo(asset.uri, options.compression);

  return {
    uri: compressed.uri,
    width: asset.width,
    height: asset.height,
    duration: asset.duration,
    size: compressed.size,
    wasCompressed: compressed.wasCompressed,
    type: 'video/mp4',
  };
};

/**
 * Upload media directly to Ghost
 *
 * @param {string} mediaUri - Local file URI
 * @param {string} filename - Desired filename
 * @param {string} ghostUrl - Ghost site URL
 * @param {string} token - Ghost Admin API token
 * @param {string} mediaType - 'image' or 'video'
 * @returns {Promise<{ url: string }>}
 */
export const uploadToGhost = async (mediaUri, filename, ghostUrl, token, mediaType = 'image') => {
  const baseUrl = ghostUrl.replace(/\/$/, '');
  const endpoint = mediaType === 'video'
    ? '/ghost/api/admin/media/upload/'
    : '/ghost/api/admin/images/upload/';

  const mimeType = mediaType === 'video' ? 'video/mp4' : 'image/jpeg';

  const formData = new FormData();
  formData.append('file', {
    uri: mediaUri,
    type: mimeType,
    name: filename || (mediaType === 'video' ? 'video.mp4' : 'image.jpg'),
  });

  const response = await fetch(`${baseUrl}${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Ghost ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.errors?.[0]?.message || `Upload failed: ${response.status}`);
  }

  const data = await response.json();

  // Ghost returns different structure for images vs media
  const url = mediaType === 'video'
    ? data.media?.[0]?.url
    : data.images?.[0]?.url;

  if (!url) {
    throw new Error('Upload succeeded but no URL returned');
  }

  return { url };
};

/**
 * Upload media directly to WordPress
 *
 * @param {string} mediaUri - Local file URI
 * @param {string} filename - Desired filename
 * @param {string} siteUrl - WordPress site URL
 * @param {string} authHeader - Basic Auth header value
 * @param {string} mediaType - 'image' or 'video'
 * @returns {Promise<{ url: string, id: number }>}
 */
export const uploadToWordPress = async (mediaUri, filename, siteUrl, authHeader, mediaType = 'image') => {
  const baseUrl = siteUrl.replace(/\/$/, '');

  const mimeType = mediaType === 'video' ? 'video/mp4' : 'image/jpeg';

  const formData = new FormData();
  formData.append('file', {
    uri: mediaUri,
    type: mimeType,
    name: filename || (mediaType === 'video' ? 'video.mp4' : 'image.jpg'),
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
    throw new Error(errorData.message || `Upload failed: ${response.status}`);
  }

  const data = await response.json();

  return {
    url: data.source_url,
    id: data.id,
  };
};

/**
 * Get mime type from file extension
 */
export const getMimeType = (filename) => {
  const ext = filename.split('.').pop()?.toLowerCase();

  const mimeTypes = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    avi: 'video/x-msvideo',
    webm: 'video/webm',
  };

  return mimeTypes[ext] || 'application/octet-stream';
};

/**
 * Check if file is a video based on URI or type
 */
export const isVideo = (uri, type) => {
  if (type?.startsWith('video/')) return true;
  const ext = uri.split('.').pop()?.toLowerCase();
  return ['mp4', 'mov', 'avi', 'webm', 'm4v'].includes(ext);
};

/**
 * Format bytes to human readable string
 */
export const formatBytes = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
