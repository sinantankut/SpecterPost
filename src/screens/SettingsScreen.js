import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing } from '../constants/theme';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import {
  saveGhostCredentials,
  getGhostCredentials,
  clearGhostCredentials,
  hasGhostCredentials,
  saveWordPressCredentials,
  getWordPressCredentials,
  clearWordPressCredentials,
  hasWordPressCredentials,
  getActivePlatform,
  setActivePlatform,
} from '../services/storage';
import { testGhostConnection, testWordPressConnection } from '../services/api';

export const SettingsScreen = ({ navigation }) => {
  // Platform selection
  const [activePlatform, setActivePlatformState] = useState('ghost');

  // Ghost credentials
  const [ghostUrl, setGhostUrl] = useState('');
  const [adminKey, setAdminKey] = useState('');
  const [ghostConfigured, setGhostConfigured] = useState(false);
  const [showAdminKey, setShowAdminKey] = useState(false);

  // WordPress credentials
  const [wpSiteUrl, setWpSiteUrl] = useState('');
  const [wpUsername, setWpUsername] = useState('');
  const [wpAppPassword, setWpAppPassword] = useState('');
  const [wpConfigured, setWpConfigured] = useState(false);
  const [showWpPassword, setShowWpPassword] = useState(false);

  // UI state
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    loadAllCredentials();
  }, []);

  const loadAllCredentials = async () => {
    // Load platform preference
    const platform = await getActivePlatform();
    setActivePlatformState(platform);

    // Load Ghost credentials
    const { ghostUrl: savedGhostUrl, adminKey: savedKey } = await getGhostCredentials();
    if (savedGhostUrl) setGhostUrl(savedGhostUrl);
    if (savedKey) setAdminKey(savedKey);
    setGhostConfigured(await hasGhostCredentials());

    // Load WordPress credentials
    const { siteUrl, username, appPassword } = await getWordPressCredentials();
    if (siteUrl) setWpSiteUrl(siteUrl);
    if (username) setWpUsername(username);
    if (appPassword) setWpAppPassword(appPassword);
    setWpConfigured(await hasWordPressCredentials());
  };

  const handlePlatformChange = async (platform) => {
    setActivePlatformState(platform);
    await setActivePlatform(platform);
  };

  // Ghost handlers
  const handleSaveGhost = async () => {
    if (!ghostUrl.trim()) {
      Alert.alert('Error', 'Please enter your Ghost site URL');
      return;
    }

    if (!adminKey.trim()) {
      Alert.alert('Error', 'Please enter your Admin API Key');
      return;
    }

    if (!ghostUrl.startsWith('http://') && !ghostUrl.startsWith('https://')) {
      Alert.alert('Error', 'Ghost URL must start with http:// or https://');
      return;
    }

    if (!adminKey.includes(':')) {
      Alert.alert('Error', 'Admin Key must be in format id:secret (with colon separator)');
      return;
    }

    setSaving(true);
    try {
      await saveGhostCredentials(ghostUrl.trim(), adminKey.trim());
      setGhostConfigured(true);
      Alert.alert('Success', 'Ghost credentials saved securely');
    } catch (error) {
      Alert.alert('Error', 'Failed to save credentials');
    } finally {
      setSaving(false);
    }
  };

  const handleTestGhost = async () => {
    if (!ghostUrl.trim() || !adminKey.trim()) {
      Alert.alert('Error', 'Please enter both Ghost URL and Admin Key first');
      return;
    }

    setTesting(true);
    try {
      const result = await testGhostConnection(ghostUrl.trim(), adminKey.trim());
      if (result.success) {
        Alert.alert('Success', 'Connected to Ghost successfully!');
      } else {
        Alert.alert('Connection Failed', result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to test connection');
    } finally {
      setTesting(false);
    }
  };

  const handleClearGhost = () => {
    Alert.alert(
      'Clear Ghost Credentials',
      'Are you sure you want to remove your Ghost credentials?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearGhostCredentials();
              setGhostUrl('');
              setAdminKey('');
              setGhostConfigured(false);
              Alert.alert('Cleared', 'Your Ghost credentials have been removed');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear credentials');
            }
          },
        },
      ]
    );
  };

  // WordPress handlers
  const handleSaveWordPress = async () => {
    if (!wpSiteUrl.trim()) {
      Alert.alert('Error', 'Please enter your WordPress site URL');
      return;
    }

    if (!wpUsername.trim()) {
      Alert.alert('Error', 'Please enter your WordPress username');
      return;
    }

    if (!wpAppPassword.trim()) {
      Alert.alert('Error', 'Please enter your Application Password');
      return;
    }

    if (!wpSiteUrl.startsWith('http://') && !wpSiteUrl.startsWith('https://')) {
      Alert.alert('Error', 'Site URL must start with http:// or https://');
      return;
    }

    setSaving(true);
    try {
      await saveWordPressCredentials(wpSiteUrl.trim(), wpUsername.trim(), wpAppPassword.trim());
      setWpConfigured(true);
      Alert.alert('Success', 'WordPress credentials saved securely');
    } catch (error) {
      Alert.alert('Error', 'Failed to save credentials');
    } finally {
      setSaving(false);
    }
  };

  const handleTestWordPress = async () => {
    if (!wpSiteUrl.trim() || !wpUsername.trim() || !wpAppPassword.trim()) {
      Alert.alert('Error', 'Please enter all WordPress credentials first');
      return;
    }

    // Save temporarily for the test
    await saveWordPressCredentials(wpSiteUrl.trim(), wpUsername.trim(), wpAppPassword.trim());

    setTesting(true);
    try {
      const result = await testWordPressConnection();
      if (result.success) {
        Alert.alert('Success', `Connected as ${result.user?.name || wpUsername}!`);
        setWpConfigured(true);
      } else {
        Alert.alert('Connection Failed', result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to test connection');
    } finally {
      setTesting(false);
    }
  };

  const handleClearWordPress = () => {
    Alert.alert(
      'Clear WordPress Credentials',
      'Are you sure you want to remove your WordPress credentials?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearWordPressCredentials();
              setWpSiteUrl('');
              setWpUsername('');
              setWpAppPassword('');
              setWpConfigured(false);
              Alert.alert('Cleared', 'Your WordPress credentials have been removed');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear credentials');
            }
          },
        },
      ]
    );
  };

  const renderPlatformSelector = () => (
    <Card style={styles.section}>
      <Text style={styles.sectionTitle}>Publishing Platform</Text>
      <Text style={styles.sectionDescription}>
        Choose which platform to use for publishing posts.
      </Text>
      <View style={styles.platformSelector}>
        <TouchableOpacity
          style={[
            styles.platformOption,
            activePlatform === 'ghost' && styles.platformOptionActive,
          ]}
          onPress={() => handlePlatformChange('ghost')}
        >
          <Ionicons
            name="logo-ghost"
            size={24}
            color={activePlatform === 'ghost' ? colors.text.inverse : colors.text.primary}
          />
          <Text
            style={[
              styles.platformOptionText,
              activePlatform === 'ghost' && styles.platformOptionTextActive,
            ]}
          >
            Ghost
          </Text>
          {ghostConfigured && (
            <Ionicons
              name="checkmark-circle"
              size={16}
              color={activePlatform === 'ghost' ? colors.text.inverse : colors.success}
              style={styles.platformCheckmark}
            />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.platformOption,
            activePlatform === 'wordpress' && styles.platformOptionActive,
          ]}
          onPress={() => handlePlatformChange('wordpress')}
        >
          <Ionicons
            name="logo-wordpress"
            size={24}
            color={activePlatform === 'wordpress' ? colors.text.inverse : colors.text.primary}
          />
          <Text
            style={[
              styles.platformOptionText,
              activePlatform === 'wordpress' && styles.platformOptionTextActive,
            ]}
          >
            WordPress
          </Text>
          {wpConfigured && (
            <Ionicons
              name="checkmark-circle"
              size={16}
              color={activePlatform === 'wordpress' ? colors.text.inverse : colors.success}
              style={styles.platformCheckmark}
            />
          )}
        </TouchableOpacity>
      </View>
    </Card>
  );

  const renderGhostConfig = () => (
    <Card style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Ghost Configuration</Text>
        {ghostConfigured && (
          <View style={styles.statusBadge}>
            <Ionicons name="checkmark-circle" size={16} color={colors.success} />
            <Text style={styles.statusText}>Connected</Text>
          </View>
        )}
      </View>
      <Text style={styles.sectionDescription}>
        Enter your Ghost site URL and Admin API key. Credentials are stored securely on your device.
      </Text>

      <Input
        label="Ghost Site URL"
        placeholder="https://your-site.ghost.io"
        value={ghostUrl}
        onChangeText={setGhostUrl}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
      />

      <View style={styles.passwordContainer}>
        <Input
          label="Admin API Key"
          placeholder="xxxxxxxxxxxxxxxx:yyyyyyyyyyyyyyyy..."
          value={adminKey}
          onChangeText={setAdminKey}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry={!showAdminKey}
          style={styles.passwordInput}
        />
        <TouchableOpacity
          style={styles.eyeButton}
          onPress={() => setShowAdminKey(!showAdminKey)}
        >
          <Ionicons
            name={showAdminKey ? 'eye-off' : 'eye'}
            size={22}
            color={colors.text.secondary}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.buttonRow}>
        <Button
          title="Test"
          onPress={handleTestGhost}
          variant="secondary"
          loading={testing}
          style={[styles.button, { marginRight: spacing.sm }]}
        />
        <Button
          title="Save"
          onPress={handleSaveGhost}
          variant="accent"
          loading={saving}
          style={[styles.button, { marginLeft: spacing.sm }]}
        />
      </View>

      {ghostConfigured && (
        <TouchableOpacity style={styles.clearButton} onPress={handleClearGhost}>
          <Ionicons name="trash-outline" size={18} color={colors.error} />
          <Text style={styles.clearButtonText}>Clear Credentials</Text>
        </TouchableOpacity>
      )}
    </Card>
  );

  const renderWordPressConfig = () => (
    <Card style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>WordPress Configuration</Text>
        {wpConfigured && (
          <View style={styles.statusBadge}>
            <Ionicons name="checkmark-circle" size={16} color={colors.success} />
            <Text style={styles.statusText}>Connected</Text>
          </View>
        )}
      </View>
      <Text style={styles.sectionDescription}>
        Enter your WordPress site URL, username, and Application Password.
      </Text>

      <Input
        label="WordPress Site URL"
        placeholder="https://your-site.com"
        value={wpSiteUrl}
        onChangeText={setWpSiteUrl}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
      />

      <Input
        label="Username"
        placeholder="your-username"
        value={wpUsername}
        onChangeText={setWpUsername}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <View style={styles.passwordContainer}>
        <Input
          label="Application Password"
          placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
          value={wpAppPassword}
          onChangeText={setWpAppPassword}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry={!showWpPassword}
          style={styles.passwordInput}
        />
        <TouchableOpacity
          style={styles.eyeButton}
          onPress={() => setShowWpPassword(!showWpPassword)}
        >
          <Ionicons
            name={showWpPassword ? 'eye-off' : 'eye'}
            size={22}
            color={colors.text.secondary}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.buttonRow}>
        <Button
          title="Test"
          onPress={handleTestWordPress}
          variant="secondary"
          loading={testing}
          style={[styles.button, { marginRight: spacing.sm }]}
        />
        <Button
          title="Save"
          onPress={handleSaveWordPress}
          variant="accent"
          loading={saving}
          style={[styles.button, { marginLeft: spacing.sm }]}
        />
      </View>

      {wpConfigured && (
        <TouchableOpacity style={styles.clearButton} onPress={handleClearWordPress}>
          <Ionicons name="trash-outline" size={18} color={colors.error} />
          <Text style={styles.clearButtonText}>Clear Credentials</Text>
        </TouchableOpacity>
      )}
    </Card>
  );

  const renderHowItWorks = () => {
    if (activePlatform === 'wordpress') {
      return (
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>How It Works (WordPress)</Text>
          <View style={styles.stepContainer}>
            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <Text style={styles.stepText}>
                Go to your WordPress Admin → Users → Profile
              </Text>
            </View>
            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <Text style={styles.stepText}>
                Scroll to "Application Passwords" and create a new one
              </Text>
            </View>
            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <Text style={styles.stepText}>
                Copy the generated password (shown only once!)
              </Text>
            </View>
            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>4</Text>
              </View>
              <Text style={styles.stepText}>
                Enter your credentials above and start publishing!
              </Text>
            </View>
          </View>
        </Card>
      );
    }

    return (
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>How It Works (Ghost)</Text>
        <View style={styles.stepContainer}>
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <Text style={styles.stepText}>
              Go to your Ghost Admin → Settings → Integrations
            </Text>
          </View>
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <Text style={styles.stepText}>
              Create a new Custom Integration and copy the Admin API Key
            </Text>
          </View>
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <Text style={styles.stepText}>
              Paste your Ghost URL and Admin Key above, then save
            </Text>
          </View>
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>4</Text>
            </View>
            <Text style={styles.stepText}>
              Start creating posts - they'll publish directly to your site!
            </Text>
          </View>
        </View>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {renderPlatformSelector()}

        {activePlatform === 'ghost' ? renderGhostConfig() : renderWordPressConfig()}

        {renderHowItWorks()}

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          <View style={styles.securityItem}>
            <Ionicons name="shield-checkmark" size={20} color={colors.accent} />
            <Text style={styles.securityText}>
              Credentials stored in device secure storage
            </Text>
          </View>
          <View style={styles.securityItem}>
            <Ionicons name="lock-closed" size={20} color={colors.accent} />
            <Text style={styles.securityText}>
              Direct connection - no third-party servers
            </Text>
          </View>
          <View style={styles.securityItem}>
            <Ionicons name="cloud-offline" size={20} color={colors.accent} />
            <Text style={styles.securityText}>
              Auth tokens generated on-device
            </Text>
          </View>
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>About SpecterPost</Text>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Version</Text>
            <Text style={styles.aboutValue}>2.0.0</Text>
          </View>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Architecture</Text>
            <Text style={styles.aboutValue}>Specter (Direct)</Text>
          </View>
          <Text style={styles.aboutDescription}>
            SpecterPost is a mobile app for publishing to Ghost and WordPress,
            designed for writers and content creators on the go.
          </Text>
        </Card>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    backgroundColor: colors.background,
  },
  headerTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  statusText: {
    fontSize: typography.sizes.xs,
    color: colors.success,
    marginLeft: 4,
    fontWeight: typography.weights.medium,
  },
  sectionDescription: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
    lineHeight: typography.lineHeights.relaxed * typography.sizes.sm,
  },
  platformSelector: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  platformOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  platformOptionActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  platformOptionText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.text.primary,
    marginLeft: spacing.sm,
  },
  platformOptionTextActive: {
    color: colors.text.inverse,
  },
  platformCheckmark: {
    marginLeft: spacing.xs,
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: 38,
    padding: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: spacing.sm,
  },
  button: {
    flex: 1,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
  },
  clearButtonText: {
    color: colors.error,
    fontSize: typography.sizes.sm,
    marginLeft: spacing.xs,
    fontWeight: typography.weights.medium,
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  aboutLabel: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
  },
  aboutValue: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.text.primary,
  },
  aboutDescription: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    marginTop: spacing.md,
    lineHeight: typography.lineHeights.relaxed * typography.sizes.sm,
  },
  stepContainer: {
    marginTop: spacing.sm,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  stepNumberText: {
    color: colors.text.inverse,
    fontWeight: typography.weights.semibold,
    fontSize: typography.sizes.sm,
  },
  stepText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.text.primary,
    lineHeight: typography.lineHeights.relaxed * typography.sizes.sm,
    marginTop: 2,
  },
  securityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  securityText: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    marginLeft: spacing.sm,
  },
});
