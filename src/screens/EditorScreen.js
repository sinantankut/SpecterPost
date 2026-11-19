import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Linking,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme, type, space, radius, fonts } from '../theme';
import { Button, IconButton, Label, Sheet, Field, Choice, Callout, Rule, tap } from '../ui';
import { BodyEditor, EditorToolbar, useMediaInserts, escapeHtml } from '../components/RichTextEditor';
import { TagSelector } from '../components/TagSelector';
import { saveDraft, getDraftById, deleteDraft, hasGhostCredentials } from '../services/storage';
import {
  fetchGhostPostById,
  createPostOnPlatform,
  updatePostOnPlatform,
  uploadMediaToPlatform,
} from '../services/api';
import { pickImageFromGallery } from '../services/imageService';
import { htmlTemplates } from '../constants/htmlTemplates';

const countWords = (html) => {
  const text = (html || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  return text ? text.split(' ').length : 0;
};

const schedulePresets = () => {
  const now = new Date();
  const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);
  inOneHour.setMinutes(0, 0, 0);
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  const monday = new Date(now);
  monday.setDate(now.getDate() + ((8 - now.getDay()) % 7 || 7));
  monday.setHours(9, 0, 0, 0);
  return [
    { value: 'hour', label: 'In an hour', date: inOneHour },
    { value: 'tomorrow', label: 'Tomorrow 9:00', date: tomorrow },
    { value: 'monday', label: 'Monday 9:00', date: monday },
  ];
};

export const EditorScreen = ({ navigation, route }) => {
  const t = useTheme();
  const editorRef = useRef(null);
  const scrollRef = useRef(null);
  const media = useMediaInserts(editorRef);

  const [ready, setReady] = useState(false);
  const [initialHtml, setInitialHtml] = useState('');
  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [cover, setCover] = useState(null);
  const [coverBusy, setCoverBusy] = useState(false);
  const [tags, setTags] = useState([]);
  const [draftId, setDraftId] = useState(null);
  const [postId, setPostId] = useState(null);
  const [postStatus, setPostStatus] = useState(null);
  const [postUrl, setPostUrl] = useState(null);
  const [visibility, setVisibility] = useState('public');
  const [featured, setFeatured] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [activeFormats, setActiveFormats] = useState([]);

  const [sheet, setSheet] = useState(null); // 'media' | 'link' | 'embed' | 'publish' | 'templates'
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [embedUrl, setEmbedUrl] = useState('');
  const [publishMode, setPublishMode] = useState('published');
  const [schedulePreset, setSchedulePreset] = useState('tomorrow');
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState(null);
  const [connected, setConnected] = useState(true);

  const applyPost = (post) => {
    setTitle(post.title || '');
    setExcerpt(post.custom_excerpt || '');
    setInitialHtml(post.html || '');
    setContent(post.html || '');
    setCover(post.feature_image || null);
    setPostId(post.id);
    setPostStatus(post.status);
    setPostUrl(post.url || null);
    setVisibility(post.visibility || 'public');
    setFeatured(!!post.featured);
    setTags((post.tags || []).map((tg) => ({ id: tg.id, name: tg.name, slug: tg.slug })));
  };

  // Load the post or draft once, then mount the editor with its content.
  useEffect(() => {
    (async () => {
      setConnected(await hasGhostCredentials());
      try {
        if (route.params?.ghostPostId) {
          if (route.params.ghostPost?.html !== undefined) {
            applyPost(route.params.ghostPost);
          } else {
            const result = await fetchGhostPostById(route.params.ghostPostId);
            if (result?.post) applyPost(result.post);
          }
        } else if (route.params?.draftId) {
          const d = await getDraftById(route.params.draftId);
          if (d) {
            setDraftId(d.id);
            setTitle(d.title || '');
            setExcerpt(d.custom_excerpt || '');
            setInitialHtml(d.content || '');
            setContent(d.content || '');
            setCover(d.featured_image || null);
            setPostId(d.ghost_post_id || null);
            setTags(Array.isArray(d.tags) ? d.tags : []);
            setSavedAt(d.updated_at);
          }
        }
      } catch (e) {
        Alert.alert('Could not open post', e.message);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  // Autosave to the phone a moment after the last change.
  const persist = useCallback(async () => {
    if (!title.trim() && !countWords(content) && !cover) return null;
    const saved = await saveDraft({
      id: draftId,
      title,
      content,
      featured_image: cover,
      custom_excerpt: excerpt,
      tags,
      platform: 'ghost',
      ghost_post_id: postId,
      status: 'draft',
    });
    setDraftId(saved.id);
    setSavedAt(saved.updated_at);
    setDirty(false);
    return saved;
  }, [title, content, cover, excerpt, tags, draftId, postId]);

  useEffect(() => {
    if (!ready || !dirty) return;
    const timer = setTimeout(() => {
      persist().catch(() => {});
    }, 1200);
    return () => clearTimeout(timer);
  }, [ready, dirty, persist]);

  const markDirty = (setter) => (value) => {
    setter(value);
    setDirty(true);
  };

  const leave = useCallback(async () => {
    if (dirty) await persist().catch(() => {});
    navigation.goBack();
  }, [dirty, persist, navigation]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        leave();
        return true;
      });
      return () => sub.remove();
    }, [leave])
  );

  const pickCover = async () => {
    try {
      const img = await pickImageFromGallery();
      if (!img?.uri) return;
      setCover(img.uri);
      setDirty(true);
      if (connected) {
        setCoverBusy(true);
        try {
          const res = await uploadMediaToPlatform(img.uri, `cover-${Date.now()}.jpg`, 'image', 'image/jpeg');
          if (res?.url) setCover(res.url);
        } catch (e) {
          // Keep the local file; it is uploaded again when publishing.
        } finally {
          setCoverBusy(false);
        }
      }
    } catch (e) {
      Alert.alert('Cover image', e.message);
    }
  };

  const coverActions = () => {
    Alert.alert('Cover image', undefined, [
      { text: 'Replace', onPress: pickCover },
      { text: 'Remove', style: 'destructive', onPress: () => markDirty(setCover)(null) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const onEditorReady = () => {
    editorRef.current?.registerToolbar?.((items) => {
      setActiveFormats(items.map((i) => (typeof i === 'string' ? i : i.type)));
    });
  };

  const onCursorPosition = (offsetY) => {
    // Keep the caret visible above the toolbar while typing.
    scrollRef.current?.scrollTo({ y: Math.max(offsetY - 40, 0) + 220, animated: true });
  };

  const insertLink = () => {
    const url = linkUrl.trim();
    if (!url) return;
    const href = /^(https?:|mailto:)/i.test(url) ? url : `https://${url}`;
    editorRef.current?.insertLink(linkText.trim() || href, href);
    setSheet(null);
    setLinkUrl('');
    setLinkText('');
  };

  const openPublish = () => {
    if (!title.trim()) {
      Alert.alert('Add a title first', 'Every post needs a title before it goes to your site.');
      return;
    }
    if (!connected) {
      Alert.alert('Connect your site', 'Add your Ghost site in Settings to publish. Your draft is saved on this phone.', [
        { text: 'Later', style: 'cancel' },
        { text: 'Open Settings', onPress: () => navigation.navigate('Settings') },
      ]);
      return;
    }
    setPublishError(null);
    setPublishMode(postStatus === 'scheduled' ? 'scheduled' : postStatus === 'draft' ? 'published' : 'published');
    setSheet('publish');
  };

  const executePublish = async () => {
    setPublishing(true);
    setPublishError(null);
    const status = publishMode;
    const preset = schedulePresets().find((p) => p.value === schedulePreset);
    const options = {
      tags,
      feature_image: cover,
      custom_excerpt: excerpt.trim() || null,
      visibility,
      featured,
    };
    if (status === 'scheduled') options.published_at = preset.date.toISOString();

    try {
      let result;
      if (postId) {
        result = await updatePostOnPlatform(postId, { title, content, status, ...options });
      } else {
        result = await createPostOnPlatform(title, content, status, options);
      }
      if (draftId) await deleteDraft(draftId).catch(() => {});
      const post = result?.post;
      setSheet(null);
      setDirty(false);
      const verb = status === 'published' ? 'Published' : status === 'scheduled' ? 'Scheduled' : 'Saved to your site';
      const buttons = [{ text: 'Done', onPress: () => navigation.goBack() }];
      if (post?.url && status === 'published') {
        buttons.unshift({ text: 'View post', onPress: () => { Linking.openURL(post.url); navigation.goBack(); } });
      }
      Alert.alert(verb, post?.title || title, buttons);
    } catch (e) {
      setPublishError(e.message || 'Publishing failed');
    } finally {
      setPublishing(false);
    }
  };

  const words = countWords(content);
  const minutes = Math.max(1, Math.round(words / 230));
  const statusText = media.uploading
    ? `${media.uploading}…`
    : dirty
      ? 'Editing'
      : savedAt
        ? 'Saved on phone'
        : postStatus === 'published'
          ? 'Published'
          : postStatus
            ? postStatus
            : 'New post';

  const mediaOptions = [
    { key: 'photo', icon: 'image-outline', label: 'Photo', run: media.imageFromLibrary },
    { key: 'camera', icon: 'camera-outline', label: 'Camera', run: media.imageFromCamera },
    { key: 'video', icon: 'film-outline', label: 'Video', run: media.videoFromLibrary },
    { key: 'record', icon: 'videocam-outline', label: 'Record', run: media.videoFromCamera },
    { key: 'audio', icon: 'musical-notes-outline', label: 'Audio', run: media.audio },
    { key: 'file', icon: 'document-attach-outline', label: 'File', run: media.file },
    { key: 'embed', icon: 'logo-youtube', label: 'Embed', run: () => setTimeout(() => setSheet('embed'), 250) },
    { key: 'paste', icon: 'clipboard-outline', label: 'Paste image', run: media.imageFromClipboard },
    { key: 'code', icon: 'code-slash-outline', label: 'Templates', run: () => setTimeout(() => setSheet('templates'), 250) },
  ];

  if (!ready) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.paper, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={t.brick} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.paper }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Top bar */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: space[2],
            paddingVertical: space[2],
            gap: space[2],
            borderBottomWidth: 1,
            borderBottomColor: t.rule,
          }}
        >
          <IconButton icon="arrow-back" onPress={leave} accessibilityLabel="Back" />
          <View style={{ flex: 1 }}>
            <Text style={[type.label, { color: media.uploading ? t.brick : t.inkMuted, fontSize: 11 }]} numberOfLines={1}>
              {statusText}
            </Text>
            <Text style={[type.caption, { color: t.inkFaint }]}>
              {words} words · {minutes} min read
            </Text>
          </View>
          <Button
            compact
            title={postStatus === 'published' ? 'Update' : 'Publish'}
            onPress={openPublish}
            disabled={!!media.uploading}
          />
        </View>

        <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: space[6] }}>
          {/* Cover */}
          {cover ? (
            <Pressable onPress={coverActions}>
              <Image source={{ uri: cover }} style={{ width: '100%', aspectRatio: 3 / 2, backgroundColor: t.paperSunken }} resizeMode="cover" />
              {coverBusy ? (
                <View style={{ position: 'absolute', right: space[3], bottom: space[3], backgroundColor: t.ink, paddingHorizontal: space[3], paddingVertical: space[1] }}>
                  <Text style={[type.caption, { color: t.paper }]}>Uploading…</Text>
                </View>
              ) : null}
            </Pressable>
          ) : (
            <Pressable
              onPress={pickCover}
              style={({ pressed }) => ({
                marginHorizontal: space[4],
                marginTop: space[4],
                flexDirection: 'row',
                alignItems: 'center',
                gap: space[2],
                paddingVertical: space[2],
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Ionicons name="image-outline" size={18} color={t.inkMuted} />
              <Text style={[type.uiSemi, { color: t.inkMuted }]}>Add cover image</Text>
            </Pressable>
          )}

          {/* Title and subtitle */}
          <TextInput
            value={title}
            onChangeText={markDirty(setTitle)}
            placeholder="Title"
            placeholderTextColor={t.inkFaint}
            selectionColor={t.brick}
            multiline
            scrollEnabled={false}
            style={[type.titleL, { color: t.ink, paddingHorizontal: space[4], paddingTop: space[4], paddingBottom: space[1] }]}
          />
          <TextInput
            value={excerpt}
            onChangeText={markDirty(setExcerpt)}
            placeholder="Subtitle (optional)"
            placeholderTextColor={t.inkFaint}
            selectionColor={t.brick}
            multiline
            scrollEnabled={false}
            maxLength={300}
            style={[type.lede, { fontFamily: fonts.serifItalic, color: t.inkMuted, paddingHorizontal: space[4], paddingBottom: space[3] }]}
          />
          <Rule style={{ marginHorizontal: space[4], marginBottom: space[4] }} />

          <BodyEditor
            ref={editorRef}
            initialContent={initialHtml}
            onChange={(html) => {
              setContent(html);
              setDirty(true);
            }}
            onCursorPosition={onCursorPosition}
            editorInitializedCallback={onEditorReady}
          />
        </ScrollView>

        <EditorToolbar
          editorRef={editorRef}
          activeFormats={activeFormats}
          onMedia={() => {
            tap();
            setSheet('media');
          }}
          onLink={() => setSheet('link')}
        />
      </KeyboardAvoidingView>

      {/* Media picker */}
      <Sheet visible={sheet === 'media'} onClose={() => setSheet(null)} title="Insert">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: space[3], paddingBottom: space[2] }}>
          {mediaOptions.map((o) => (
            <Pressable
              key={o.key}
              onPress={() => {
                tap();
                setSheet(null);
                o.run();
              }}
              style={({ pressed }) => ({
                width: '33.33%',
                alignItems: 'center',
                gap: space[2],
                paddingVertical: space[4],
                backgroundColor: pressed ? t.paperSunken : 'transparent',
              })}
            >
              <View style={{ width: 52, height: 52, alignItems: 'center', justifyContent: 'center', backgroundColor: t.paperRaised, borderWidth: 1, borderColor: t.rule, borderRadius: radius.sm }}>
                <Ionicons name={o.icon} size={24} color={t.ink} />
              </View>
              <Text style={[type.caption, { color: t.ink }]}>{o.label}</Text>
            </Pressable>
          ))}
        </View>
        {!connected ? (
          <Callout kind="caveat" style={{ marginHorizontal: space[4] }}>
            Not connected to a site. Photos are kept in the draft; video, audio and files need a connection.
          </Callout>
        ) : null}
      </Sheet>

      {/* Link */}
      <Sheet
        visible={sheet === 'link'}
        onClose={() => setSheet(null)}
        title="Add link"
        footer={<Button title="Insert link" onPress={insertLink} disabled={!linkUrl.trim()} />}
      >
        <View style={{ paddingHorizontal: space[4], gap: space[3] }}>
          <Field label="Address" placeholder="https://" value={linkUrl} onChangeText={setLinkUrl} autoCapitalize="none" keyboardType="url" autoFocus />
          <Field label="Text" placeholder="Shown in the post (optional)" value={linkText} onChangeText={setLinkText} />
        </View>
      </Sheet>

      {/* Embed */}
      <Sheet
        visible={sheet === 'embed'}
        onClose={() => setSheet(null)}
        title="Embed"
        footer={
          <Button
            title="Embed"
            disabled={!embedUrl.trim()}
            onPress={() => {
              media.embed(embedUrl);
              setEmbedUrl('');
              setSheet(null);
            }}
          />
        }
      >
        <View style={{ paddingHorizontal: space[4], gap: space[3] }}>
          <Field
            label="Link"
            placeholder="YouTube, Vimeo or any web address"
            value={embedUrl}
            onChangeText={setEmbedUrl}
            autoCapitalize="none"
            keyboardType="url"
            autoFocus
            hint="YouTube and Vimeo links become players. Other links are inserted as a link."
          />
        </View>
      </Sheet>

      {/* Templates */}
      <Sheet visible={sheet === 'templates'} onClose={() => setSheet(null)} title="Templates">
        <ScrollView style={{ maxHeight: 420 }}>
          {htmlTemplates.map((tpl, i) => (
            <Pressable
              key={tpl.id}
              onPress={() => {
                editorRef.current?.insertHTML(tpl.template);
                setSheet(null);
              }}
              style={({ pressed }) => ({
                paddingHorizontal: space[4],
                paddingVertical: space[3],
                borderTopWidth: i ? 1 : 0,
                borderTopColor: t.rule,
                backgroundColor: pressed ? t.paperSunken : 'transparent',
              })}
            >
              <Text style={[type.uiSemi, { color: t.ink }]}>{tpl.name}</Text>
              <Text style={[type.caption, { color: t.inkMuted }]}>{tpl.description}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </Sheet>

      {/* Publish */}
      <Sheet
        visible={sheet === 'publish'}
        onClose={() => setSheet(null)}
        title={postId ? 'Update post' : 'Publish'}
        footer={
          <Button
            title={
              publishMode === 'published'
                ? postStatus === 'published' ? 'Update now' : 'Publish now'
                : publishMode === 'scheduled'
                  ? 'Schedule'
                  : 'Save to site as draft'
            }
            loading={publishing}
            onPress={executePublish}
          />
        }
      >
        <ScrollView style={{ maxHeight: 520 }} contentContainerStyle={{ paddingHorizontal: space[4], gap: space[5], paddingBottom: space[2] }} keyboardShouldPersistTaps="handled">
          <View style={{ gap: space[2] }}>
            <Label>When</Label>
            <Choice
              value={publishMode}
              onChange={setPublishMode}
              options={[
                { value: 'published', label: 'Now', icon: 'flash-outline' },
                { value: 'scheduled', label: 'Schedule', icon: 'time-outline' },
                { value: 'draft', label: 'Keep as draft', icon: 'document-outline' },
              ]}
            />
            {publishMode === 'scheduled' ? (
              <View style={{ gap: space[2], marginTop: space[2] }}>
                <Choice value={schedulePreset} onChange={setSchedulePreset} options={schedulePresets().map(({ value, label }) => ({ value, label }))} />
                <Text style={[type.caption, { color: t.inkMuted }]}>
                  Goes live {schedulePresets().find((p) => p.value === schedulePreset)?.date.toLocaleString(undefined, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={{ gap: space[2] }}>
            <Label>Who can read it</Label>
            <Choice
              value={visibility}
              onChange={setVisibility}
              options={[
                { value: 'public', label: 'Everyone' },
                { value: 'members', label: 'Members' },
                { value: 'paid', label: 'Paid members' },
              ]}
            />
          </View>

          <View style={{ gap: space[2] }}>
            <Label>Tags</Label>
            <TagSelector selectedTags={tags} onTagsChange={markDirty(setTags)} />
          </View>

          <Pressable onPress={() => setFeatured((f) => !f)} style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
            <Ionicons name={featured ? 'checkbox' : 'square-outline'} size={22} color={featured ? t.brick : t.inkMuted} />
            <Text style={[type.ui, { color: t.ink }]}>Feature this post</Text>
          </Pressable>

          {publishError ? <Callout kind="error" title="Not published">{publishError}</Callout> : null}
        </ScrollView>
      </Sheet>
    </SafeAreaView>
  );
};
