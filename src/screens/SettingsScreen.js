import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Alert, Linking, Image, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import { useTheme, type, space, radius } from '../theme';
import { Title, Label, Button, IconButton, Field, Callout, Rule } from '../ui';
import {
  saveGhostCredentials,
  getGhostCredentials,
  clearGhostCredentials,
  setActivePlatform,
} from '../services/storage';
import { testGhostConnection, getGhostSiteInfo } from '../services/api';
import { validateGhostAdminKey, validateGhostUrl } from '../services/authService';

const normalizeUrl = (raw) => {
  let url = raw.trim();
  if (!url) return url;
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  // People often paste the admin URL; keep only the site root.
  url = url.replace(/\/ghost(\/.*)?$/i, '').replace(/\/+$/, '');
  return url;
};

export const SettingsScreen = ({ navigation }) => {
  const t = useTheme();
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [site, setSite] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    (async () => {
      const creds = await getGhostCredentials();
      if (creds.ghostUrl) setUrl(creds.ghostUrl);
      if (creds.adminKey) setKey(creds.adminKey);
      if (creds.ghostUrl && creds.adminKey) {
        setConnected(true);
        const info = await getGhostSiteInfo().catch(() => null);
        if (info?.success) setSite(info.site);
      }
    })();
  }, []);

  const connect = async () => {
    setError(null);
    const siteUrl = normalizeUrl(url);
    const adminKey = key.trim();
    const u = validateGhostUrl(siteUrl);
    if (!u.valid) return setError(u.error);
    const k = validateGhostAdminKey(adminKey);
    if (!k.valid) return setError(`${k.error}. Copy the whole "Admin API key" from your integration.`);

    setBusy(true);
    const previous = await getGhostCredentials();
    try {
      await saveGhostCredentials(siteUrl, adminKey);
      const result = await testGhostConnection(siteUrl, adminKey);
      if (!result.success) {
        // Put the previous working credentials back.
        if (previous.ghostUrl && previous.adminKey) {
          await saveGhostCredentials(previous.ghostUrl, previous.adminKey);
        } else {
          await clearGhostCredentials();
        }
        setError(result.error || 'Could not connect. Check the address and key.');
        return;
      }
      await setActivePlatform('ghost');
      setUrl(siteUrl);
      setConnected(true);
      const info = await getGhostSiteInfo().catch(() => null);
      if (info?.success) setSite(info.site);
    } catch (e) {
      setError(e.message || 'Could not connect');
    } finally {
      setBusy(false);
    }
  };

  const disconnect = () => {
    Alert.alert('Disconnect this site?', 'Your key is removed from this phone. Local drafts stay.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disconnect',
        style: 'destructive',
        onPress: async () => {
          await clearGhostCredentials();
          setConnected(false);
          setSite(null);
          setKey('');
        },
      },
    ]);
  };

  const pasteKey = async () => {
    const text = await Clipboard.getStringAsync();
    if (text) setKey(text.trim());
  };

  const version = Constants.expoConfig?.version || '1.0.0';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.paper }} edges={['top', 'bottom']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space[2], paddingTop: space[2] }}>
        <IconButton icon="close" onPress={() => navigation.goBack()} accessibilityLabel="Close settings" />
        <Label>Settings</Label>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: space[4], gap: space[5], paddingBottom: space[8] }} keyboardShouldPersistTaps="handled">
        <View style={{ gap: space[2] }}>
          <Rule strong />
          <Label color={t.brickDeep} style={{ marginTop: space[2] }}>Your publication</Label>
          <Title size="M">{connected ? 'Connected to Ghost' : 'Connect your Ghost site'}</Title>
          <Text style={[type.body, { color: t.inkMuted }]}>
            SpecterPost talks to your site directly. Your key stays encrypted on this phone and is never sent anywhere else.
          </Text>
        </View>

        {connected && site ? (
          <View
            style={{
              flexDirection: 'row',
              gap: space[3],
              alignItems: 'center',
              padding: space[4],
              backgroundColor: t.paperRaised,
              borderWidth: 1,
              borderColor: t.rule,
            }}
          >
            {site.icon ? <Image source={{ uri: site.icon }} style={{ width: 44, height: 44, borderRadius: radius.sm }} /> : null}
            <View style={{ flex: 1 }}>
              <Text style={[type.titleS, { color: t.ink }]} numberOfLines={1}>{site.title}</Text>
              <Text style={[type.caption, { color: t.inkMuted }]} numberOfLines={1}>{site.url}</Text>
            </View>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: t.moss }} />
          </View>
        ) : null}

        <View style={{ gap: space[4] }}>
          <Field
            label="Site address"
            placeholder="https://yourblog.com"
            value={url}
            onChangeText={setUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            textContentType="URL"
          />
          <Field
            label="Admin API key"
            placeholder="64f1…:a3b9…"
            value={key}
            onChangeText={setKey}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry={!showKey}
            hint="In Ghost Admin: Settings, Integrations, Add custom integration. Copy the Admin API key."
            right={
              <View style={{ flexDirection: 'row' }}>
                <IconButton icon="clipboard-outline" size={18} onPress={pasteKey} accessibilityLabel="Paste key" />
                <IconButton icon={showKey ? 'eye-off-outline' : 'eye-outline'} size={18} onPress={() => setShowKey((s) => !s)} accessibilityLabel="Show key" />
              </View>
            }
          />
          {error ? <Callout kind="error" title="Not connected">{error}</Callout> : null}
          <Button title={connected ? 'Save and reconnect' : 'Connect'} onPress={connect} loading={busy} />
          {connected ? <Button title="Disconnect" variant="outline" onPress={disconnect} /> : null}
          <Pressable onPress={() => Linking.openURL('https://ghost.org/integrations/custom-integrations/')}>
            <Text style={[type.ui, { color: t.brick, textDecorationLine: 'underline' }]}>
              How to create a custom integration
            </Text>
          </Pressable>
        </View>

        <Rule />

        <View style={{ gap: space[2] }}>
          <Label>About</Label>
          <Text style={[type.ui, { color: t.inkMuted }]}>
            SpecterPost {version}. Write anywhere, publish to any Ghost 5 site. Images, video, audio and files upload straight to your site's storage.
          </Text>
          <Text style={[type.caption, { color: t.inkFaint }]}>
            Appearance follows your phone's light or dark setting.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
