import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type, space, radius } from '../theme';
import { searchTagsOnPlatform } from '../services/api';

const same = (a, b) => (a.id && b.id ? a.id === b.id : a.name?.toLowerCase() === b.name?.toLowerCase());

/**
 * Tag picker: chips for selected tags, search-as-you-type against the site's
 * existing tags, and Enter to create a new one.
 */
export const TagSelector = ({ selectedTags = [], onTagsChange, maxTags = 10 }) => {
  const t = useTheme();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    clearTimeout(timer.current);
    const q = query.trim();
    if (!q) {
      setSuggestions([]);
      return;
    }
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const result = await searchTagsOnPlatform(q);
        setSuggestions((result.tags || []).filter((tag) => !selectedTags.some((s) => same(s, tag))).slice(0, 6));
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer.current);
  }, [query, selectedTags]);

  const add = (tag) => {
    if (selectedTags.length >= maxTags || selectedTags.some((s) => same(s, tag))) return;
    onTagsChange([...selectedTags, tag]);
    setQuery('');
    setSuggestions([]);
  };

  const submit = () => {
    const name = query.trim();
    if (!name) return;
    const exact = suggestions.find((s) => s.name?.toLowerCase() === name.toLowerCase());
    add(exact ? { id: exact.id, name: exact.name, slug: exact.slug } : { name });
  };

  const remove = (tag) => onTagsChange(selectedTags.filter((s) => !same(s, tag)));

  return (
    <View style={{ gap: space[2] }}>
      {selectedTags.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
          {selectedTags.map((tag) => (
            <Pressable
              key={tag.id || tag.name}
              onPress={() => remove(tag)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: space[1],
                paddingLeft: space[3],
                paddingRight: space[2],
                height: 32,
                borderRadius: radius.sm,
                backgroundColor: t.brickTint,
              }}
            >
              <Text style={[type.uiSemi, { fontSize: 14, color: t.ink }]}>{tag.name}</Text>
              <Ionicons name="close" size={14} color={t.inkMuted} />
            </Pressable>
          ))}
        </View>
      ) : null}

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: space[2],
          paddingHorizontal: space[3],
          backgroundColor: t.paperRaised,
          borderWidth: 1,
          borderColor: t.rule,
          borderRadius: radius.sm,
        }}
      >
        <Ionicons name="pricetag-outline" size={16} color={t.inkMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={submit}
          blurOnSubmit={false}
          returnKeyType="done"
          placeholder={selectedTags.length >= maxTags ? 'Tag limit reached' : 'Add a tag'}
          editable={selectedTags.length < maxTags}
          placeholderTextColor={t.inkFaint}
          selectionColor={t.brick}
          autoCapitalize="none"
          style={[type.ui, { flex: 1, minHeight: 44, color: t.ink }]}
        />
        {loading ? <ActivityIndicator size="small" color={t.brick} /> : null}
      </View>

      {query.trim() ? (
        <View style={{ borderWidth: 1, borderColor: t.rule, backgroundColor: t.paperRaised }}>
          {suggestions.map((s, i) => (
            <Pressable
              key={s.id}
              onPress={() => add({ id: s.id, name: s.name, slug: s.slug })}
              style={({ pressed }) => ({
                paddingHorizontal: space[3],
                paddingVertical: space[3],
                borderTopWidth: i ? 1 : 0,
                borderTopColor: t.rule,
                backgroundColor: pressed ? t.paperSunken : 'transparent',
                flexDirection: 'row',
                justifyContent: 'space-between',
              })}
            >
              <Text style={[type.ui, { color: t.ink }]}>{s.name}</Text>
              {s.count?.posts != null ? <Text style={[type.caption, { color: t.inkMuted }]}>{s.count.posts} posts</Text> : null}
            </Pressable>
          ))}
          {!suggestions.some((s) => s.name?.toLowerCase() === query.trim().toLowerCase()) ? (
            <Pressable
              onPress={submit}
              style={({ pressed }) => ({
                paddingHorizontal: space[3],
                paddingVertical: space[3],
                borderTopWidth: suggestions.length ? 1 : 0,
                borderTopColor: t.rule,
                backgroundColor: pressed ? t.paperSunken : 'transparent',
              })}
            >
              <Text style={[type.uiSemi, { color: t.brick }]}>Create tag "{query.trim()}"</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
};

export default TagSelector;
