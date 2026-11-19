import React, { useRef, useCallback, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Keyboard,
  Text,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  actions,
  RichEditor,
  RichToolbar,
} from 'react-native-pell-rich-editor';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { colors, typography, spacing, borderRadius, shadows } from '../constants/theme';
import {
  pickImageFromGallery,
  takePhoto,
  imageToBase64,
  formatFileSize,
  processClipboardImage,
} from '../services/imageService';
import { uploadMediaToPlatform } from '../services/api';

const RichTextEditor = ({
  initialContent = '',
  onContentChange,
  placeholder = 'Begin writing your story...',
  minHeight = 400,
}) => {
  const richText = useRef(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);

  const handleContentChange = useCallback((html) => {
    if (onContentChange) {
      onContentChange(html);
    }
  }, [onContentChange]);

  const [uploadLabel, setUploadLabel] = useState('');

  const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Roboto', sans-serif";

  const escapeHtml = (str = '') =>
    String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const filenameFromUri = (uri, fallback) => {
    const last = (uri || '').split('/').pop()?.split('?')[0];
    return last && last.includes('.') ? decodeURIComponent(last) : fallback;
  };

  /**
   * Upload a local file to the connected blog and return its public URL.
   * Runs with a visible progress overlay so the user knows what is happening.
   */
  const uploadWithProgress = useCallback(async (uri, filename, mediaType, mimeType, label) => {
    setUploadLabel(label);
    setIsProcessingImage(true);
    try {
      const result = await uploadMediaToPlatform(uri, filename, mediaType, mimeType);
      if (!result?.url) throw new Error('Upload did not return a URL');
      return result.url;
    } finally {
      setIsProcessingImage(false);
      setUploadLabel('');
    }
  }, []);

  const insertImage = useCallback(async (imageData) => {
    if (!imageData || !richText.current) return;

    let src;
    try {
      src = await uploadWithProgress(
        imageData.uri,
        filenameFromUri(imageData.uri, `image-${Date.now()}.jpg`),
        'image',
        imageData.type || 'image/jpeg',
        'Uploading image…'
      );
    } catch (error) {
      // Offline or blog not configured: keep writing, embed locally for now.
      console.warn('Image upload failed, embedding inline:', error?.message);
      try {
        src = await imageToBase64(imageData.uri);
      } catch (e) {
        Alert.alert('Error', 'Failed to insert image');
        return;
      }
      Alert.alert(
        'Image embedded offline',
        `Could not upload to your blog (${error?.message || 'unknown error'}). The image is embedded in the post instead; you can re-insert it once you are online.`
      );
    }

    const html = `
      <figure class="kg-card kg-image-card kg-card-hascaption" style="margin: 24px 0; text-align: center;">
        <img class="kg-image" src="${src}" style="width: 100%; border-radius: 12px; display: block;" />
        <figcaption style="margin-top: 12px; font-size: 14px; color: #8E8E93; font-family: ${FONT};">Add a caption...</figcaption>
      </figure>
      <p><br/></p>
    `;
    richText.current.insertHTML(html);
  }, [uploadWithProgress]);

  const insertVideo = useCallback(async (asset) => {
    if (!asset?.uri) return;
    try {
      const filename = asset.fileName || filenameFromUri(asset.uri, `video-${Date.now()}.mp4`);
      const url = await uploadWithProgress(asset.uri, filename, 'video', asset.mimeType, 'Uploading video…');
      const html = `
        <figure class="kg-card kg-video-card" style="margin: 24px 0;">
          <video src="${url}" controls playsinline preload="metadata" style="width: 100%; border-radius: 12px; background: #000;"></video>
        </figure>
        <p><br/></p>
      `;
      richText.current?.insertHTML(html);
    } catch (error) {
      Alert.alert('Video upload failed', error?.message || 'Please check your connection and blog settings.');
    }
  }, [uploadWithProgress]);

  const handlePickVideoFromLibrary = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library to insert videos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await insertVideo(result.assets[0]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick video from gallery');
      console.error('Video picker error:', error);
    }
  }, [insertVideo]);

  const handleRecordVideo = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow camera access to record videos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['videos'],
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await insertVideo(result.assets[0]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to record video');
      console.error('Video recording error:', error);
    }
  }, [insertVideo]);

  const showVideoOptions = useCallback(() => {
    Alert.alert(
      'Add Video',
      'Choose an option',
      [
        { text: 'Video Library', onPress: handlePickVideoFromLibrary },
        { text: 'Record Video', onPress: handleRecordVideo },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }, [handlePickVideoFromLibrary, handleRecordVideo]);

  const handlePickAudio = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.length) return;

      const audio = result.assets[0];
      const url = await uploadWithProgress(audio.uri, audio.name, 'audio', audio.mimeType, 'Uploading audio…');
      const html = `
        <figure class="kg-card kg-audio-card" style="margin: 24px 0; background-color: #F2F2F7; border-radius: 12px; padding: 16px;">
          <div style="font-weight: 600; margin-bottom: 8px; font-family: ${FONT};">${escapeHtml(audio.name)}</div>
          <audio src="${url}" controls preload="metadata" style="width: 100%;"></audio>
        </figure>
        <p><br/></p>
      `;
      richText.current?.insertHTML(html);
    } catch (error) {
      Alert.alert('Audio upload failed', error?.message || 'Please check your connection and blog settings.');
    }
  }, [uploadWithProgress]);

  const handlePickDocument = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets?.length) return;

      const doc = result.assets[0];
      const url = await uploadWithProgress(doc.uri, doc.name, 'file', doc.mimeType, 'Uploading file…');
      const fileSize = doc.size ? formatFileSize(doc.size) : '';
      const html = `
        <div class="kg-card kg-file-card" style="margin: 24px 0; background-color: #F2F2F7; border-radius: 12px; padding: 16px; border: 1px solid #E5E5EA;">
          <a class="kg-file-card-container" href="${url}" download style="text-decoration: none; color: inherit; display: block;">
            <div style="font-weight: 600; color: #000; font-family: ${FONT}; margin-bottom: 4px;">📎 ${escapeHtml(doc.name)}</div>
            <div style="font-size: 13px; color: #8E8E93; font-family: ${FONT};">${escapeHtml(doc.mimeType || 'File')}${fileSize ? ` • ${fileSize}` : ''}</div>
          </a>
        </div>
        <p><br/></p>
      `;
      richText.current?.insertHTML(html);
    } catch (error) {
      Alert.alert('File upload failed', error?.message || 'Please check your connection and blog settings.');
      console.error('Document picker error:', error);
    }
  }, [uploadWithProgress]);

  const handlePickImage = useCallback(async () => {
    try {
      const imageData = await pickImageFromGallery();
      if (imageData) {
        await insertImage(imageData);
      }
    } catch (error) {
      if (error.message.includes('permission')) {
        Alert.alert('Permission Required', 'Please allow access to your photo library to insert images.');
      } else {
        Alert.alert('Error', 'Failed to pick image from gallery');
      }
    }
  }, [insertImage]);

  const handleTakePhoto = useCallback(async () => {
    try {
      const imageData = await takePhoto();
      if (imageData) {
        await insertImage(imageData);
      }
    } catch (error) {
      if (error.message.includes('permission')) {
        Alert.alert('Permission Required', 'Please allow camera access to take photos.');
      } else {
        Alert.alert('Error', 'Failed to take photo');
      }
    }
  }, [insertImage]);

  const handlePasteFromClipboard = useCallback(async () => {
    try {
      setIsProcessingImage(true);

      // Check for image in clipboard
      const hasImage = await Clipboard.hasImageAsync();

      if (hasImage) {
        const clipboardImage = await Clipboard.getImageAsync({ format: 'base64' });
        if (clipboardImage && clipboardImage.data) {
          const processed = await processClipboardImage(clipboardImage.data);
          await insertImage(processed);
          return;
        }
      }

      // Check for text/HTML in clipboard
      const clipboardText = await Clipboard.getStringAsync();
      if (clipboardText) {
        // Check if it's base64 image data
        if (clipboardText.startsWith('data:image')) {
          const processed = await processClipboardImage(clipboardText);
          await insertImage(processed);
        } else {
          // Insert as HTML or text
          richText.current?.insertHTML(clipboardText);
        }
      } else {
        Alert.alert('Clipboard Empty', 'No image or text found in clipboard');
      }
    } catch (error) {
      console.error('Paste error:', error);
      Alert.alert('Error', 'Failed to paste from clipboard');
    } finally {
      setIsProcessingImage(false);
    }
  }, [insertImage]);

  const showImageOptions = useCallback(() => {
    Alert.alert(
      'Add Image',
      'Choose an option',
      [
        { text: 'Photo Library', onPress: handlePickImage },
        { text: 'Take Photo', onPress: handleTakePhoto },
        { text: 'Paste from Clipboard', onPress: handlePasteFromClipboard },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }, [handlePickImage, handleTakePhoto, handlePasteFromClipboard]);

  const renderCustomAction = useCallback((action, selected) => {
    const iconMap = {
      [actions.setBold]: { name: 'text', label: 'B' },
      [actions.setItalic]: { name: 'text', label: 'I' },
      [actions.setUnderline]: { name: 'text', label: 'U' },
      [actions.insertBulletsList]: { name: 'list', label: null },
      [actions.insertOrderedList]: { name: 'list-outline', label: null },
      [actions.heading1]: { name: 'text', label: 'H1' },
      [actions.heading2]: { name: 'text', label: 'H2' },
      [actions.setStrikethrough]: { name: 'text', label: 'S' },
      [actions.blockquote]: { name: 'chatbox-outline', label: null },
      [actions.code]: { name: 'code-slash', label: null },
    };

    const icon = iconMap[action];
    if (!icon) return null;

    return (
      <View style={[styles.toolbarButton, selected && styles.toolbarButtonActive]}>
        {icon.label ? (
          <Text style={[
            styles.toolbarButtonText,
            selected && styles.toolbarButtonTextActive,
            action === actions.setBold && styles.boldText,
            action === actions.setItalic && styles.italicText,
            action === actions.setUnderline && styles.underlineText,
            action === actions.setStrikethrough && styles.strikethroughText,
          ]}>
            {icon.label}
          </Text>
        ) : (
          <Ionicons
            name={icon.name}
            size={18}
            color={selected ? colors.accent : colors.text.secondary}
          />
        )}
      </View>
    );
  }, []);

  return (
    <View style={styles.container}>
      {/* Editor - RichEditor handles its own scrolling via WebView */}
      <View style={styles.editorWrapper}>
        <RichEditor
          ref={richText}
          style={[styles.editor, { minHeight }]}
          containerStyle={styles.editorContainer}
          placeholder={placeholder}
          initialContentHTML={initialContent}
          onChange={handleContentChange}
          scrollEnabled={true}
          editorStyle={{
            backgroundColor: colors.background,
            contentCSSText: `
              font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Roboto', sans-serif;
              font-size: 18px; 
              line-height: 1.6;
              color: ${colors.text.primary};
              padding: 0;
            `,
            placeholderColor: colors.text.tertiary,
            cssText: `
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Roboto', sans-serif;
              }
              h1 { font-size: 24px; font-weight: 700; margin: 24px 0 12px; }
              h2 { font-size: 20px; font-weight: 600; margin: 20px 0 10px; }
              p { margin-bottom: 16px; font-size: 18px; line-height: 1.6; }
              img { max-width: 100%; border-radius: 8px; margin: 16px 0; }
              blockquote { border-left: 3px solid ${colors.accent}; padding-left: 16px; font-style: italic; color: ${colors.text.secondary}; }
            `,
          }}
          useContainer={true}
          pasteAsPlainText={false}
        />
      </View>

      {/* Accessory Bar (Bottom Toolbar) */}
      <View style={styles.accessoryBar}>
        <RichToolbar
          editor={richText}
          style={styles.toolbar}
          flatContainerStyle={styles.toolbarFlatContainer}
          selectedIconTint={colors.accent}
          iconTint={colors.text.primary}
          actions={[
            actions.heading1,
            actions.setBold,
            actions.setItalic,
            'separator',
            'image',
            'video',
            'audio',
            'document'
          ]}
          iconMap={{
            [actions.heading1]: () => <Text style={styles.formatIcon}>H</Text>,
            [actions.setBold]: () => <Text style={styles.formatIcon}>B</Text>,
            [actions.setItalic]: () => <Text style={[styles.formatIcon, { fontStyle: 'italic' }]}>I</Text>,
            'separator': () => <View style={styles.separator} />,
            'image': () => (
              <TouchableOpacity onPress={showImageOptions} style={styles.mediaButton}>
                <Ionicons name="image-outline" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            ),
            'video': () => (
              <TouchableOpacity onPress={showVideoOptions} style={styles.mediaButton}>
                <Ionicons name="videocam-outline" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            ),
            'audio': () => (
              <TouchableOpacity onPress={handlePickAudio} style={styles.mediaButton}>
                <Ionicons name="musical-notes-outline" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            ),
            'document': () => (
              <TouchableOpacity onPress={handlePickDocument} style={styles.mediaButton}>
                <Ionicons name="attach-outline" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            )
          }}
          onPressAddImage={showImageOptions}
        />
      </View>

      {isProcessingImage && (
        <View style={styles.uploadOverlay} pointerEvents="auto">
          <View style={styles.uploadPill}>
            <ActivityIndicator size="small" color={colors.text.inverse} />
            <Text style={styles.uploadText}>{uploadLabel || 'Processing…'}</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  accessoryBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    minHeight: 50,
  },
  toolbar: {
    backgroundColor: 'transparent',
    flex: 1,
  },
  toolbarFlatContainer: {
    paddingHorizontal: 0,
  },
  formatIcon: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    width: 32,
    textAlign: 'center',
  },
  mediaButton: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
  },
  uploadText: {
    color: colors.text.inverse,
    fontSize: 15,
    fontWeight: '600',
  },
  separator: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
    marginHorizontal: 8,
  },
  editorWrapper: {
    flex: 1,
    paddingBottom: 60, // Space for toolbar
  },
  editorContainer: {
    flex: 1,
    paddingHorizontal: 0,
  },
  editor: {
    flex: 1,
    backgroundColor: colors.background,
  },
});

export default RichTextEditor;
