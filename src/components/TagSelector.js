import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../constants/theme';
import { searchTagsOnPlatform, getActivePlatform } from '../services/api';

/**
 * TagSelector Component
 *
 * Allows users to search, select, and add tags for their posts.
 * Supports autocomplete from existing tags and creating new ones.
 */
export const TagSelector = ({
  selectedTags = [],
  onTagsChange,
  placeholder = 'Search or add tags...',
  maxTags = 10,
}) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [platform, setPlatform] = useState('ghost');
  const searchTimeout = useRef(null);
  const inputRef = useRef(null);

  // Get active platform on mount
  useEffect(() => {
    const loadPlatform = async () => {
      const activePlatform = await getActivePlatform();
      setPlatform(activePlatform);
    };
    loadPlatform();
  }, []);

  // Search for tags with debounce
  const searchTags = useCallback(async (searchQuery) => {
    if (!searchQuery.trim() || platform !== 'ghost') {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const result = await searchTagsOnPlatform(searchQuery);
      // Filter out already selected tags
      const filteredTags = (result.tags || []).filter(
        tag => !selectedTags.some(
          selected => selected.id === tag.id ||
                     selected.name?.toLowerCase() === tag.name?.toLowerCase()
        )
      );
      setSuggestions(filteredTags);
    } catch (error) {
      console.error('Error searching tags:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, [selectedTags, platform]);

  // Debounced search
  useEffect(() => {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    if (query.trim()) {
      searchTimeout.current = setTimeout(() => {
        searchTags(query);
      }, 300);
    } else {
      setSuggestions([]);
    }

    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, [query, searchTags]);

  // Add a tag (either from suggestions or as new)
  const addTag = useCallback((tag) => {
    if (selectedTags.length >= maxTags) {
      return;
    }

    // Check if already selected
    const isAlreadySelected = selectedTags.some(
      selected => selected.id === tag.id ||
                 selected.name?.toLowerCase() === tag.name?.toLowerCase()
    );

    if (!isAlreadySelected) {
      onTagsChange([...selectedTags, tag]);
    }

    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
  }, [selectedTags, onTagsChange, maxTags]);

  // Add new tag from text input
  const addNewTag = useCallback(() => {
    const tagName = query.trim();
    if (!tagName || selectedTags.length >= maxTags) {
      return;
    }

    // Check if already selected
    const isAlreadySelected = selectedTags.some(
      selected => selected.name?.toLowerCase() === tagName.toLowerCase()
    );

    if (!isAlreadySelected) {
      // Create new tag object (Ghost will create it if it doesn't exist)
      const newTag = { name: tagName };
      onTagsChange([...selectedTags, newTag]);
    }

    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
  }, [query, selectedTags, onTagsChange, maxTags]);

  // Remove a tag
  const removeTag = useCallback((tagToRemove) => {
    onTagsChange(selectedTags.filter(tag =>
      tag.id !== tagToRemove.id &&
      tag.name?.toLowerCase() !== tagToRemove.name?.toLowerCase()
    ));
  }, [selectedTags, onTagsChange]);

  // Handle submit on keyboard
  const handleSubmitEditing = useCallback(() => {
    if (query.trim()) {
      // Check if there's an exact match in suggestions
      const exactMatch = suggestions.find(
        tag => tag.name?.toLowerCase() === query.trim().toLowerCase()
      );

      if (exactMatch) {
        addTag(exactMatch);
      } else {
        addNewTag();
      }
    }
  }, [query, suggestions, addTag, addNewTag]);

  // Render selected tag chip
  const renderSelectedTag = ({ item }) => (
    <View style={styles.tagChip}>
      <Text style={styles.tagChipText} numberOfLines={1}>
        {item.name}
      </Text>
      <TouchableOpacity
        onPress={() => removeTag(item)}
        style={styles.tagRemoveButton}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="close" size={14} color={colors.text.secondary} />
      </TouchableOpacity>
    </View>
  );

  // Render suggestion item
  const renderSuggestion = ({ item }) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => addTag(item)}
    >
      <Ionicons name="pricetag-outline" size={16} color={colors.text.tertiary} />
      <Text style={styles.suggestionText}>{item.name}</Text>
      {item.count !== undefined && (
        <Text style={styles.suggestionCount}>{item.count} posts</Text>
      )}
    </TouchableOpacity>
  );

  // Check if WordPress (limited tag support)
  if (platform === 'wordpress') {
    return (
      <View style={styles.container}>
        <View style={styles.disabledContainer}>
          <Ionicons name="information-circle-outline" size={20} color={colors.text.tertiary} />
          <Text style={styles.disabledText}>
            Tag management for WordPress coming soon
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Selected Tags */}
      {selectedTags.length > 0 && (
        <View style={styles.selectedTagsContainer}>
          <FlatList
            data={selectedTags}
            renderItem={renderSelectedTag}
            keyExtractor={(item, index) => item.id || item.name || index.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.selectedTagsList}
          />
        </View>
      )}

      {/* Search Input */}
      <View style={styles.inputContainer}>
        <Ionicons name="pricetag-outline" size={18} color={colors.text.tertiary} />
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={colors.text.tertiary}
          value={query}
          onChangeText={(text) => {
            setQuery(text);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onSubmitEditing={handleSubmitEditing}
          returnKeyType="done"
          autoCapitalize="none"
          autoCorrect={false}
          editable={selectedTags.length < maxTags}
        />
        {loading && (
          <ActivityIndicator size="small" color={colors.accent} />
        )}
        {query.trim() && !loading && (
          <TouchableOpacity
            onPress={handleSubmitEditing}
            style={styles.addButton}
          >
            <Ionicons name="add" size={20} color={colors.accent} />
          </TouchableOpacity>
        )}
      </View>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <FlatList
            data={suggestions}
            renderItem={renderSuggestion}
            keyExtractor={(item) => item.id || item.name}
            keyboardShouldPersistTaps="handled"
            style={styles.suggestionsList}
          />
        </View>
      )}

      {/* Create new tag hint */}
      {showSuggestions && query.trim() && !loading && suggestions.length === 0 && (
        <TouchableOpacity
          style={styles.createHint}
          onPress={addNewTag}
        >
          <Ionicons name="add-circle-outline" size={16} color={colors.accent} />
          <Text style={styles.createHintText}>
            Create tag "{query.trim()}"
          </Text>
        </TouchableOpacity>
      )}

      {/* Tag count indicator */}
      <Text style={styles.tagCount}>
        {selectedTags.length} / {maxTags} tags
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  selectedTagsContainer: {
    marginBottom: spacing.sm,
  },
  selectedTagsList: {
    paddingRight: spacing.md,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.accent}15`,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.xs,
    paddingLeft: spacing.sm,
    paddingRight: spacing.xs,
    marginRight: spacing.xs,
    maxWidth: 150,
  },
  tagChipText: {
    fontSize: typography.sizes.sm,
    color: colors.accent,
    fontWeight: typography.weights.medium,
    marginRight: spacing.xs,
  },
  tagRemoveButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: `${colors.accent}25`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: typography.sizes.base,
    color: colors.text.primary,
    padding: 0,
  },
  addButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: `${colors.accent}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  suggestionsContainer: {
    marginTop: spacing.xs,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: 200,
    overflow: 'hidden',
  },
  suggestionsList: {
    maxHeight: 200,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  suggestionText: {
    flex: 1,
    fontSize: typography.sizes.base,
    color: colors.text.primary,
  },
  suggestionCount: {
    fontSize: typography.sizes.xs,
    color: colors.text.tertiary,
  },
  createHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  createHintText: {
    fontSize: typography.sizes.sm,
    color: colors.accent,
    fontWeight: typography.weights.medium,
  },
  tagCount: {
    fontSize: typography.sizes.xs,
    color: colors.text.tertiary,
    marginTop: spacing.sm,
    textAlign: 'right',
  },
  disabledContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  disabledText: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
  },
});

export default TagSelector;
