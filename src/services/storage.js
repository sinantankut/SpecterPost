import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

// Lazy import to avoid circular dependency with authService
let _clearGhostTokenCache = null;
const getClearGhostTokenCache = () => {
  if (!_clearGhostTokenCache) {
    try {
      _clearGhostTokenCache = require('./authService').clearGhostTokenCache;
    } catch (e) {
      // authService not loaded yet, that's okay
      _clearGhostTokenCache = () => { };
    }
  }
  return _clearGhostTokenCache;
};

const STORAGE_KEYS = {
  DRAFTS: '@specterpost:drafts',
  SETTINGS: '@specterpost:settings',
  ACTIVE_PLATFORM: '@specterpost:active_platform', // 'ghost' or 'wordpress'
};

const SECURE_KEYS = {
  // Ghost credentials
  GHOST_URL: 'specterpost_ghost_url',
  ADMIN_KEY: 'specterpost_admin_key',
  // WordPress credentials
  WP_SITE_URL: 'specterpost_wp_site_url',
  WP_USERNAME: 'specterpost_wp_username',
  WP_APP_PASSWORD: 'specterpost_wp_app_password',
};

import { saveDraftToDb, getDraftsFromDb, getDraftByIdFromDb, deleteDraftFromDb } from './db';

// ... (keep usage of AsyncStorage for settings)

export const saveDraft = async (draft) => {
  return await saveDraftToDb(draft);
};

export const getDrafts = async () => {
  return await getDraftsFromDb();
};

export const getDraftById = async (id) => {
  return await getDraftByIdFromDb(id);
};

export const deleteDraft = async (id) => {
  return await deleteDraftFromDb(id);
};


export const saveSettings = async (settings) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving settings:', error);
    throw error;
  }
};

export const getSettings = async () => {
  try {
    const settingsJson = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
    return settingsJson ? JSON.parse(settingsJson) : {
      autoSave: true,
      videoBitrate: 800000, // Default 0.8 Mbps
    };
  } catch (error) {
    console.error('Error getting settings:', error);
    return { autoSave: true, videoBitrate: 800000 };
  }
};

// Platform selection (Ghost or WordPress)
export const setActivePlatform = async (platform) => {
  try {
    if (platform !== 'ghost' && platform !== 'wordpress') {
      throw new Error('Platform must be "ghost" or "wordpress"');
    }
    await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_PLATFORM, platform);
  } catch (error) {
    console.error('Error setting active platform:', error);
    throw error;
  }
};

export const getActivePlatform = async () => {
  try {
    const platform = await AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_PLATFORM);
    return platform || 'ghost'; // Default to Ghost
  } catch (error) {
    console.error('Error getting active platform:', error);
    return 'ghost';
  }
};

// Ghost credential storage using expo-secure-store
export const saveGhostCredentials = async (ghostUrl, adminKey) => {
  try {
    // Clear any cached token when credentials change
    getClearGhostTokenCache()();

    await SecureStore.setItemAsync(SECURE_KEYS.GHOST_URL, ghostUrl);
    await SecureStore.setItemAsync(SECURE_KEYS.ADMIN_KEY, adminKey);
    return true;
  } catch (error) {
    console.error('Error saving Ghost credentials:', error);
    throw error;
  }
};

export const getGhostCredentials = async () => {
  try {
    const ghostUrl = await SecureStore.getItemAsync(SECURE_KEYS.GHOST_URL);
    const adminKey = await SecureStore.getItemAsync(SECURE_KEYS.ADMIN_KEY);
    return { ghostUrl, adminKey };
  } catch (error) {
    console.error('Error getting Ghost credentials:', error);
    return { ghostUrl: null, adminKey: null };
  }
};

export const hasGhostCredentials = async () => {
  try {
    const { ghostUrl, adminKey } = await getGhostCredentials();
    return !!(ghostUrl && adminKey);
  } catch (error) {
    return false;
  }
};

export const clearGhostCredentials = async () => {
  try {
    // Clear any cached token when credentials are cleared
    getClearGhostTokenCache()();

    await SecureStore.deleteItemAsync(SECURE_KEYS.GHOST_URL);
    await SecureStore.deleteItemAsync(SECURE_KEYS.ADMIN_KEY);
    return true;
  } catch (error) {
    console.error('Error clearing Ghost credentials:', error);
    throw error;
  }
};

// WordPress credential storage using expo-secure-store
export const saveWordPressCredentials = async (siteUrl, username, appPassword) => {
  try {
    await SecureStore.setItemAsync(SECURE_KEYS.WP_SITE_URL, siteUrl);
    await SecureStore.setItemAsync(SECURE_KEYS.WP_USERNAME, username);
    await SecureStore.setItemAsync(SECURE_KEYS.WP_APP_PASSWORD, appPassword);
    return true;
  } catch (error) {
    console.error('Error saving WordPress credentials:', error);
    throw error;
  }
};

export const getWordPressCredentials = async () => {
  try {
    const siteUrl = await SecureStore.getItemAsync(SECURE_KEYS.WP_SITE_URL);
    const username = await SecureStore.getItemAsync(SECURE_KEYS.WP_USERNAME);
    const appPassword = await SecureStore.getItemAsync(SECURE_KEYS.WP_APP_PASSWORD);
    return { siteUrl, username, appPassword };
  } catch (error) {
    console.error('Error getting WordPress credentials:', error);
    return { siteUrl: null, username: null, appPassword: null };
  }
};

export const hasWordPressCredentials = async () => {
  try {
    const { siteUrl, username, appPassword } = await getWordPressCredentials();
    return !!(siteUrl && username && appPassword);
  } catch (error) {
    return false;
  }
};

export const clearWordPressCredentials = async () => {
  try {
    await SecureStore.deleteItemAsync(SECURE_KEYS.WP_SITE_URL);
    await SecureStore.deleteItemAsync(SECURE_KEYS.WP_USERNAME);
    await SecureStore.deleteItemAsync(SECURE_KEYS.WP_APP_PASSWORD);
    return true;
  } catch (error) {
    console.error('Error clearing WordPress credentials:', error);
    throw error;
  }
};
