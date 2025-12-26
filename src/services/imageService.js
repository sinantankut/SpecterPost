import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { File, Paths } from 'expo-file-system';

// Target file size range in bytes (200KB - 500KB)
const MIN_TARGET_SIZE = 200 * 1024;
const MAX_TARGET_SIZE = 500 * 1024;

/**
 * Request camera permissions
 */
export const requestCameraPermission = async () => {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  return status === 'granted';
};

/**
 * Request media library permissions
 */
export const requestMediaLibraryPermission = async () => {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return status === 'granted';
};

/**
 * Get file size using new File API
 */
const getFileSize = (uri) => {
  try {
    const file = new File(uri);
    return file.size;
  } catch (error) {
    console.warn('Error getting file size:', error);
    return 0;
  }
};

/**
 * Compress an image to target size (200-500KB)
 * Uses iterative compression to find optimal quality
 */
export const compressImage = async (uri, initialWidth = null) => {
  try {
    const originalSize = getFileSize(uri);

    // If already within target range, return original
    if (originalSize > 0 && originalSize <= MAX_TARGET_SIZE) {
      // Even if small, we might want to return a copy or just uri
      // But if it's huge, we compress. 
      // If it's small enough, just return it.
      return { uri, size: originalSize, wasCompressed: false };
    }

    // Get image dimensions (not easily available without loading, but we can guess or rely on manipulator)
    let targetWidth = initialWidth;

    // Start with quality estimation based on original size
    let quality = 0.8;
    if (originalSize > 5 * 1024 * 1024) {
      // > 5MB, start lower
      quality = 0.4;
      targetWidth = targetWidth || 1200;
    } else if (originalSize > 2 * 1024 * 1024) {
      // > 2MB
      quality = 0.5;
      targetWidth = targetWidth || 1400;
    } else if (originalSize > 1024 * 1024) {
      // > 1MB
      quality = 0.6;
      targetWidth = targetWidth || 1600;
    } else {
      targetWidth = targetWidth || 1800;
    }

    // Iterative compression to hit target size
    let compressedUri = uri;
    let compressedSize = originalSize;
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      const actions = [];

      // Resize if we have a target width
      if (targetWidth) {
        actions.push({ resize: { width: targetWidth } });
      }

      const result = await ImageManipulator.manipulateAsync(
        uri,
        actions,
        {
          compress: quality,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      compressedUri = result.uri;
      compressedSize = getFileSize(compressedUri);

      // Check if within target range
      if (compressedSize <= MAX_TARGET_SIZE) {
        break;
      }

      // Adjust parameters for next iteration
      if (compressedSize > MAX_TARGET_SIZE) {
        // Still too big, reduce quality and/or size
        quality = Math.max(0.1, quality - 0.15);
        targetWidth = Math.max(800, (targetWidth || 1600) - 200);
      }
      // We don't really need to optimize for "too small" as long as quality is decent

      attempts++;
    }

    return {
      uri: compressedUri,
      size: compressedSize,
      wasCompressed: true,
      originalSize,
    };
  } catch (error) {
    console.error('Error compressing image:', error);
    throw error;
  }
};

/**
 * Pick image from device gallery
 */
export const pickImageFromGallery = async (options = {}) => {
  const hasPermission = await requestMediaLibraryPermission();
  if (!hasPermission) {
    throw new Error('Media library permission denied');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: options.allowsEditing ?? false,
    quality: 1, // Get full quality, we'll compress ourselves
    base64: false,
    ...options,
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }

  const asset = result.assets[0];

  // Compress the image to target size
  const compressed = await compressImage(asset.uri, asset.width);

  return {
    uri: compressed.uri,
    width: asset.width,
    height: asset.height,
    size: compressed.size,
    wasCompressed: compressed.wasCompressed,
    originalSize: compressed.originalSize,
    type: 'image/jpeg',
  };
};

/**
 * Take photo with camera
 */
export const takePhoto = async (options = {}) => {
  const hasPermission = await requestCameraPermission();
  if (!hasPermission) {
    throw new Error('Camera permission denied');
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    allowsEditing: options.allowsEditing ?? false,
    quality: 1,
    base64: false,
    ...options,
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }

  const asset = result.assets[0];

  // Compress the image to target size
  const compressed = await compressImage(asset.uri, asset.width);

  return {
    uri: compressed.uri,
    width: asset.width,
    height: asset.height,
    size: compressed.size,
    wasCompressed: compressed.wasCompressed,
    originalSize: compressed.originalSize,
    type: 'image/jpeg',
  };
};

/**
 * Convert image to base64 for embedding in HTML
 */
export const imageToBase64 = async (uri) => {
  try {
    const file = new File(uri);
    const base64 = await file.base64();
    // base64() already returns data:image/...;base64,... format
    return base64.startsWith('data:') ? base64 : `data:image/jpeg;base64,${base64}`;
  } catch (error) {
    console.error('Error converting image to base64:', error);
    throw error;
  }
};

/**
 * Process clipboard image (for paste functionality)
 */
export const processClipboardImage = async (base64Data) => {
  try {
    // Remove data URL prefix if present
    const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');

    // Create a temporary file
    const tempFile = new File(Paths.cache, `clipboard_${Date.now()}.jpg`);

    // Convert base64 to Uint8Array
    const binaryString = atob(cleanBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Write bytes to temp file
    tempFile.create();
    tempFile.write(bytes);

    // Compress the image
    const compressed = await compressImage(tempFile.uri);

    return {
      uri: compressed.uri,
      size: compressed.size,
      wasCompressed: compressed.wasCompressed,
      type: 'image/jpeg',
    };
  } catch (error) {
    console.error('Error processing clipboard image:', error);
    throw error;
  }
};

/**
 * Format file size for display
 */
export const formatFileSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
