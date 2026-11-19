/**
 * Rich text editing: the WebView-based body editor, its toolbar, and the
 * media insertion logic (images, video, audio, files, embeds) that uploads
 * straight to the connected Ghost site and inserts Ghost-style cards.
 */
import React, { forwardRef, useCallback, useState } from 'react';
import { View, Text, ScrollView, Alert, Pressable } from 'react-native';
import { RichEditor, actions } from 'react-native-pell-rich-editor';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme, type, space, radius } from '../theme';
import { tap } from '../ui';
import {
  pickImageFromGallery,
  takePhoto,
  imageToBase64,
  formatFileSize,
  processClipboardImage,
} from '../services/imageService';
import { uploadMediaToPlatform } from '../services/api';

export const escapeHtml = (str = '') =>
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
 * CSS injected into the editor WebView so the writing surface matches the
 * app: serif body, condensed headings, square images.
 */
const editorCss = (t) => `
  @import url('https://fonts.googleapis.com/css2?family=Fira+Sans:wght@400;600&family=Fira+Sans+Condensed:wght@600;700&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&display=swap');
  body { font-family: 'Source Serif 4', Georgia, serif; }
  p, li { font-size: 19px; line-height: 1.62; }
  p { margin: 0 0 18px; }
  h1, h2, h3, h4 { font-family: 'Fira Sans Condensed', 'Roboto Condensed', sans-serif; font-weight: 700; line-height: 1.15; color: ${t.ink}; }
  h1 { font-size: 30px; margin: 32px 0 12px; }
  h2 { font-size: 25px; margin: 28px 0 10px; }
  h3 { font-size: 21px; margin: 24px 0 8px; font-weight: 600; }
  a { color: ${t.brick}; }
  blockquote { margin: 24px 0; padding: 4px 0 4px 18px; border-left: 2px solid ${t.brick}; font-style: italic; color: ${t.inkMuted}; }
  hr { border: none; border-top: 1px solid ${t.rule}; margin: 32px 0; }
  pre, code { font-family: ui-monospace, Menlo, monospace; font-size: 15px; background: ${t.paperSunken}; }
  pre { padding: 12px; overflow-x: auto; }
  img { max-width: 100%; height: auto; border-radius: 0; display: block; }
  figure { margin: 28px 0; }
  figcaption { font-family: 'Fira Sans', sans-serif; font-size: 14px; color: ${t.inkMuted}; margin-top: 8px; text-align: center; }
  video, audio, iframe { max-width: 100%; }
  .kg-file-card a { display: block; padding: 14px 16px; background: ${t.paperSunken}; color: ${t.ink}; text-decoration: none; font-family: 'Fira Sans', sans-serif; }
`;

export const BodyEditor = forwardRef(({ initialContent, onChange, onCursorPosition, placeholder, editorInitializedCallback }, ref) => {
  const t = useTheme();
  return (
    <RichEditor
      ref={ref}
      initialContentHTML={initialContent}
      onChange={onChange}
      onCursorPosition={onCursorPosition}
      editorInitializedCallback={editorInitializedCallback}
      placeholder={placeholder || 'Tell your story…'}
      useContainer
      initialHeight={360}
      pasteAsPlainText={false}
      editorStyle={{
        backgroundColor: t.paper,
        color: t.ink,
        caretColor: t.brick,
        placeholderColor: t.inkFaint,
        contentCSSText: 'font-size: 19px; line-height: 1.62; padding: 0 16px 48px;',
        cssText: editorCss(t),
      }}
      style={{ backgroundColor: t.paper }}
    />
  );
});

/**
 * Media insertion. Returns handlers bound to the given editor ref plus the
 * current upload label for a progress indicator.
 */
export const useMediaInserts = (editorRef) => {
  const [uploading, setUploading] = useState(null);

  const insert = (html) => editorRef.current?.insertHTML(`${html}<p><br/></p>`);

  const upload = useCallback(async (uri, filename, kind, mimeType, label) => {
    setUploading(label);
    try {
      const result = await uploadMediaToPlatform(uri, filename, kind, mimeType);
      if (!result?.url) throw new Error('Upload did not return a URL');
      return result.url;
    } finally {
      setUploading(null);
    }
  }, []);

  const insertImage = useCallback(async (imageData) => {
    if (!imageData) return;
    let src;
    try {
      src = await upload(
        imageData.uri,
        filenameFromUri(imageData.uri, `image-${Date.now()}.jpg`),
        'image',
        imageData.type || 'image/jpeg',
        'Uploading image'
      );
    } catch (error) {
      // Offline or not connected: keep writing, embed the image inline for now.
      try {
        src = await imageToBase64(imageData.uri);
      } catch (e) {
        Alert.alert('Could not insert image', e.message);
        return;
      }
      Alert.alert(
        'Image kept on this phone',
        `Upload failed (${error?.message || 'no connection'}). The image is embedded in the draft. Insert it again when you are online so it is stored on your site.`
      );
    }
    insert(
      `<figure class="kg-card kg-image-card kg-card-hascaption"><img class="kg-image" src="${src}" alt="" /><figcaption>Caption</figcaption></figure>`
    );
  }, [upload]);

  const imageFromLibrary = useCallback(async () => {
    try {
      await insertImage(await pickImageFromGallery());
    } catch (e) {
      Alert.alert('Photo library', e.message);
    }
  }, [insertImage]);

  const imageFromCamera = useCallback(async () => {
    try {
      await insertImage(await takePhoto());
    } catch (e) {
      Alert.alert('Camera', e.message);
    }
  }, [insertImage]);

  const imageFromClipboard = useCallback(async () => {
    try {
      if (await Clipboard.hasImageAsync()) {
        const img = await Clipboard.getImageAsync({ format: 'jpeg' });
        if (img?.data) return insertImage(await processClipboardImage(img.data));
      }
      Alert.alert('Clipboard', 'There is no image on the clipboard.');
    } catch (e) {
      Alert.alert('Clipboard', e.message);
    }
  }, [insertImage]);

  const insertVideoAsset = useCallback(async (asset) => {
    if (!asset?.uri) return;
    try {
      const name = asset.fileName || filenameFromUri(asset.uri, `video-${Date.now()}.mp4`);
      const url = await upload(asset.uri, name, 'video', asset.mimeType, 'Uploading video');
      insert(
        `<figure class="kg-card kg-video-card"><video src="${url}" controls playsinline preload="metadata" style="width:100%"></video></figure>`
      );
    } catch (e) {
      Alert.alert('Video upload failed', e.message || 'Check your connection and site settings.');
    }
  }, [upload]);

  const videoFromLibrary = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') return Alert.alert('Permission needed', 'Allow access to your videos to insert one.');
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], quality: 1 });
    if (!r.canceled && r.assets?.length) insertVideoAsset(r.assets[0]);
  }, [insertVideoAsset]);

  const videoFromCamera = useCallback(async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (perm.status !== 'granted') return Alert.alert('Permission needed', 'Allow camera access to record a video.');
    const r = await ImagePicker.launchCameraAsync({ mediaTypes: ['videos'], quality: 1 });
    if (!r.canceled && r.assets?.length) insertVideoAsset(r.assets[0]);
  }, [insertVideoAsset]);

  const audio = useCallback(async () => {
    try {
      const r = await DocumentPicker.getDocumentAsync({ type: 'audio/*', copyToCacheDirectory: true });
      if (r.canceled || !r.assets?.length) return;
      const a = r.assets[0];
      const url = await upload(a.uri, a.name, 'audio', a.mimeType, 'Uploading audio');
      insert(
        `<figure class="kg-card kg-audio-card"><figcaption style="text-align:left;font-weight:600">${escapeHtml(a.name)}</figcaption><audio src="${url}" controls preload="metadata" style="width:100%"></audio></figure>`
      );
    } catch (e) {
      Alert.alert('Audio upload failed', e.message || 'Check your connection and site settings.');
    }
  }, [upload]);

  const file = useCallback(async () => {
    try {
      const r = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (r.canceled || !r.assets?.length) return;
      const d = r.assets[0];
      const url = await upload(d.uri, d.name, 'file', d.mimeType, 'Uploading file');
      const size = d.size ? ` · ${formatFileSize(d.size)}` : '';
      insert(
        `<div class="kg-card kg-file-card"><a class="kg-file-card-container" href="${url}" download><strong>${escapeHtml(d.name)}</strong><br/><small>${escapeHtml(d.mimeType || 'File')}${size}</small></a></div>`
      );
    } catch (e) {
      Alert.alert('File upload failed', e.message || 'Check your connection and site settings.');
    }
  }, [upload]);

  /**
   * Embed a URL: YouTube and Vimeo become players, anything else a link.
   */
  const embed = useCallback((rawUrl) => {
    const url = (rawUrl || '').trim();
    if (!url) return;
    const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/i);
    const vimeo = url.match(/vimeo\.com\/(\d+)/i);
    let src = null;
    if (yt) src = `https://www.youtube.com/embed/${yt[1]}`;
    else if (vimeo) src = `https://player.vimeo.com/video/${vimeo[1]}`;
    if (src) {
      insert(
        `<figure class="kg-card kg-embed-card"><iframe src="${src}" width="100%" height="220" frameborder="0" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe></figure>`
      );
    } else {
      insert(`<p><a href="${escapeHtml(url)}">${escapeHtml(url)}</a></p>`);
    }
  }, []);

  return {
    uploading,
    imageFromLibrary,
    imageFromCamera,
    imageFromClipboard,
    videoFromLibrary,
    videoFromCamera,
    audio,
    file,
    embed,
  };
};

/**
 * Formatting and media toolbar, shown above the keyboard.
 */
export const EditorToolbar = ({ editorRef, activeFormats = [], onMedia, onLink }) => {
  const t = useTheme();
  const send = (action) => {
    tap();
    editorRef.current?.showAndroidKeyboard?.();
    editorRef.current?.sendAction(action, 'result');
  };
  const isOn = (a) => activeFormats.includes(a);

  const items = [
    { key: 'media', icon: 'add', label: 'Media', onPress: onMedia, accent: true },
    { key: 'sep0', sep: true },
    { key: 'h2', label: 'H2', onPress: () => send(actions.heading2), active: isOn(actions.heading2) },
    { key: 'h3', label: 'H3', onPress: () => send(actions.heading3), active: isOn(actions.heading3) },
    { key: 'bold', label: 'B', onPress: () => send(actions.setBold), active: isOn(actions.setBold) },
    { key: 'italic', label: 'I', italic: true, onPress: () => send(actions.setItalic), active: isOn(actions.setItalic) },
    { key: 'link', icon: 'link-outline', onPress: onLink },
    { key: 'quote', icon: 'chatbox-ellipses-outline', onPress: () => send(actions.blockquote), active: isOn(actions.blockquote) },
    { key: 'ul', icon: 'list-outline', onPress: () => send(actions.insertBulletsList), active: isOn(actions.insertBulletsList) },
    { key: 'ol', icon: 'reorder-four-outline', onPress: () => send(actions.insertOrderedList), active: isOn(actions.insertOrderedList) },
    { key: 'hr', icon: 'remove-outline', onPress: () => send(actions.setHR) },
    { key: 'sep1', sep: true },
    { key: 'undo', icon: 'arrow-undo-outline', onPress: () => send(actions.undo) },
    { key: 'redo', icon: 'arrow-redo-outline', onPress: () => send(actions.redo) },
  ];

  return (
    <View style={{ borderTopWidth: 1, borderTopColor: t.rule, backgroundColor: t.paperRaised }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        contentContainerStyle={{ alignItems: 'center', paddingHorizontal: space[2], height: 52 }}
      >
        {items.map((it) =>
          it.sep ? (
            <View key={it.key} style={{ width: 1, height: 24, backgroundColor: t.rule, marginHorizontal: space[2] }} />
          ) : (
            <Pressable
              key={it.key}
              onPress={it.onPress}
              accessibilityLabel={it.key}
              style={({ pressed }) => ({
                minWidth: 40,
                height: 38,
                paddingHorizontal: it.accent ? space[3] : space[2],
                marginHorizontal: 1,
                flexDirection: 'row',
                gap: space[1],
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: radius.sm,
                backgroundColor: it.accent ? (pressed ? t.brickDeep : t.brick) : pressed || it.active ? t.paperSunken : 'transparent',
              })}
            >
              {it.icon ? <Ionicons name={it.icon} size={20} color={it.accent ? t.onBrick : it.active ? t.brick : t.ink} /> : null}
              {it.label ? (
                <Text
                  style={{
                    fontSize: it.accent ? 14 : 18,
                    color: it.accent ? t.onBrick : it.active ? t.brick : t.ink,
                    fontFamily: it.italic
                      ? 'SourceSerif4_400Regular_Italic'
                      : it.accent
                        ? 'FiraSans_600SemiBold'
                        : 'FiraSansCondensed_700Bold',
                  }}
                >
                  {it.label}
                </Text>
              ) : null}
            </Pressable>
          )
        )}
      </ScrollView>
    </View>
  );
};

export default BodyEditor;
