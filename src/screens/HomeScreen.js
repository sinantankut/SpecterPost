import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type, space, radius } from '../theme';
import { Title, Label, Button, IconButton, Tabs, Callout, tap } from '../ui';
import { fetchGhostPosts, getGhostSiteInfo } from '../services/api';
import { hasGhostCredentials, getDrafts, deleteDraft } from '../services/storage';

const stripHtml = (html = '') =>
  html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

const relativeDate = (iso) => {
  if (!iso) return '';
  const date = new Date(iso);
  const diffMin = (Date.now() - date.getTime()) / 60000;
  if (diffMin < 0) {
    return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${Math.floor(diffMin)} min ago`;
  if (diffMin < 60 * 24) return `${Math.floor(diffMin / 60)} h ago`;
  if (diffMin < 60 * 24 * 7) return `${Math.floor(diffMin / 1440)} d ago`;
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

export const HomeScreen = ({ navigation }) => {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState('drafts');
  const [localDrafts, setLocalDrafts] = useState([]);
  const [remotePosts, setRemotePosts] = useState([]);
  const [site, setSite] = useState(null);
  const [connected, setConnected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const drafts = await getDrafts();
      setLocalDrafts(drafts.map((d) => ({ ...d, isLocal: true, status: 'local' })));

      const hasCreds = await hasGhostCredentials();
      setConnected(hasCreds);
      if (hasCreds) {
        const [postsResult, siteResult] = await Promise.all([
          fetchGhostPosts({ limit: 50, status: 'all' }),
          getGhostSiteInfo().catch(() => null),
        ]);
        setRemotePosts((postsResult?.posts || []).map((p) => ({ ...p, isLocal: false })));
        if (siteResult?.success) setSite(siteResult.site);
      } else {
        setRemotePosts([]);
      }
    } catch (err) {
      setError(err.message || 'Could not reach your blog');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const lists = useMemo(() => {
    // A local draft linked to a remote post replaces it in the Drafts tab.
    const linkedIds = new Set(localDrafts.map((d) => d.ghost_post_id).filter(Boolean));
    return {
      drafts: [
        ...localDrafts,
        ...remotePosts.filter((p) => p.status === 'draft' && !linkedIds.has(p.id)),
      ].sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0)),
      scheduled: remotePosts.filter((p) => p.status === 'scheduled'),
      published: remotePosts.filter((p) => p.status === 'published' || p.status === 'sent'),
    };
  }, [localDrafts, remotePosts]);

  const open = (item) => {
    if (item.isLocal) navigation.navigate('Editor', { draftId: item.id });
    else navigation.navigate('Editor', { ghostPostId: item.id, ghostPost: item });
  };

  const confirmDeleteLocal = (item) => {
    if (!item.isLocal) return;
    Alert.alert('Delete this local draft?', item.title || 'Untitled', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteDraft(item.id);
          load(true);
        },
      },
    ]);
  };

  const statusLabel = (item) => {
    if (item.isLocal) return item.ghost_post_id ? 'Unsaved edits' : 'On this phone';
    if (item.status === 'scheduled') return `Scheduled · ${relativeDate(item.published_at)}`;
    if (item.status === 'published' || item.status === 'sent') return `Published · ${relativeDate(item.published_at)}`;
    return 'Draft on site';
  };

  const renderItem = ({ item, index }) => {
    const cover = item.feature_image || item.featured_image;
    const excerpt = item.custom_excerpt || item.excerpt || stripHtml(item.content || item.html || '');
    const statusColor = item.isLocal ? t.amber : item.status === 'published' ? t.moss : item.status === 'scheduled' ? t.dusk : t.inkMuted;
    return (
      <Pressable
        onPress={() => {
          tap();
          open(item);
        }}
        onLongPress={() => confirmDeleteLocal(item)}
        style={({ pressed }) => ({
          flexDirection: 'row',
          gap: space[4],
          paddingVertical: space[4],
          paddingHorizontal: space[4],
          backgroundColor: pressed ? t.paperSunken : 'transparent',
          borderTopWidth: index === 0 ? 0 : 1,
          borderTopColor: t.rule,
        })}
      >
        <View style={{ flex: 1, gap: space[1] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: statusColor }} />
            <Text style={[type.label, { color: t.inkMuted, fontSize: 11 }]} numberOfLines={1}>
              {statusLabel(item)}
            </Text>
          </View>
          <Text style={[type.titleS, { color: t.ink }]} numberOfLines={2}>
            {item.title || 'Untitled'}
          </Text>
          {excerpt ? (
            <Text style={[type.body, { color: t.inkMuted, fontSize: 15, lineHeight: 22 }]} numberOfLines={2}>
              {excerpt}
            </Text>
          ) : null}
          <Text style={[type.caption, { color: t.inkFaint }]}>
            Edited {relativeDate(item.updated_at || item.updatedAt)}
            {item.reading_time ? ` · ${item.reading_time} min read` : ''}
          </Text>
        </View>
        {cover ? (
          <Image
            source={{ uri: cover }}
            style={{ width: 84, height: 84, borderRadius: radius.none, backgroundColor: t.paperSunken }}
          />
        ) : null}
      </Pressable>
    );
  };

  const data = lists[tab] || [];

  const empty = () => {
    if (loading) return null;
    if (connected === false && tab !== 'drafts') {
      return (
        <View style={{ padding: space[4] }}>
          <Callout title="Connect your Ghost site">
            Add your site address and an Admin API key to see and edit your posts here.
          </Callout>
        </View>
      );
    }
    const copy = {
      drafts: ['Nothing in progress', 'Start a new post. Drafts save on your phone as you type.'],
      scheduled: ['Nothing scheduled', 'Pick a date and time when you publish to schedule a post.'],
      published: ['No published posts yet', 'Your published posts will appear here.'],
    }[tab];
    return (
      <View style={{ paddingHorizontal: space[4], paddingVertical: space[7], gap: space[2] }}>
        <Title size="S">{copy[0]}</Title>
        <Text style={[type.body, { color: t.inkMuted }]}>{copy[1]}</Text>
      </View>
    );
  };

  const siteName = site?.title || (connected ? 'Your blog' : 'SpecterPost');
  const siteHost = site?.url ? site.url.replace(/^https?:\/\//, '').replace(/\/$/, '') : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.paper }} edges={['top']}>
      <View style={{ paddingHorizontal: space[4], paddingTop: space[3] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], flex: 1 }}>
            {site?.icon ? (
              <Image source={{ uri: site.icon }} style={{ width: 32, height: 32, borderRadius: radius.sm }} />
            ) : null}
            <View style={{ flex: 1 }}>
              <Label color={t.brick}>{siteHost || 'Ghost publishing'}</Label>
            </View>
          </View>
          <IconButton icon="settings-outline" onPress={() => navigation.navigate('Settings')} accessibilityLabel="Settings" />
        </View>
        <Title size="L" numberOfLines={2} style={{ marginTop: space[2] }}>
          {siteName}
        </Title>
        {site?.description ? (
          <Text style={[type.lede, { color: t.inkMuted, fontFamily: 'SourceSerif4_400Regular_Italic', marginTop: space[1] }]} numberOfLines={2}>
            {site.description}
          </Text>
        ) : null}
        <Tabs
          style={{ marginTop: space[4] }}
          value={tab}
          onChange={setTab}
          options={[
            { value: 'drafts', label: 'Drafts', count: lists.drafts.length },
            { value: 'scheduled', label: 'Scheduled', count: lists.scheduled.length },
            { value: 'published', label: 'Published', count: lists.published.length },
          ]}
        />
      </View>

      {connected === false && tab === 'drafts' ? (
        <Pressable onPress={() => navigation.navigate('Settings')} style={{ margin: space[4], marginBottom: 0 }}>
          <Callout title="Connect your Ghost site">
            Writing works offline. To publish, add your site address and an Admin API key. Tap here.
          </Callout>
        </Pressable>
      ) : null}

      {error ? (
        <Callout kind="error" title="Could not reach your blog" style={{ margin: space[4], marginBottom: 0 }}>
          {error}
        </Callout>
      ) : null}

      {loading && !refreshing ? (
        <ActivityIndicator style={{ marginTop: space[7] }} color={t.brick} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => `${item.isLocal ? 'l' : 'r'}-${item.id}`}
          renderItem={renderItem}
          ListEmptyComponent={empty}
          contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={t.brick} colors={[t.brick]} />
          }
        />
      )}

      <View style={{ position: 'absolute', right: space[4], bottom: insets.bottom + space[4] }}>
        <Pressable
          accessibilityLabel="Write a new post"
          onPress={() => {
            tap();
            navigation.navigate('Editor', {});
          }}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: space[2],
            height: 56,
            paddingHorizontal: space[5],
            borderRadius: radius.sm,
            backgroundColor: pressed ? t.brickDeep : t.brick,
            elevation: 4,
            shadowColor: '#000',
            shadowOpacity: 0.18,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
          })}
        >
          <Ionicons name="create-outline" size={20} color={t.onBrick} />
          <Text style={[type.uiSemi, { color: t.onBrick, fontSize: 16 }]}>Write</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};
