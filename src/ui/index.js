/**
 * Small set of themed building blocks shared by every screen.
 */
import React from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme, type, space, radius, fonts } from '../theme';

export const tap = () => {
  Haptics.selectionAsync().catch(() => {});
};

export const Label = ({ children, style, color }) => {
  const t = useTheme();
  return <Text style={[type.label, { color: color || t.inkMuted }, style]}>{children}</Text>;
};

export const Title = ({ children, size = 'M', style, numberOfLines }) => {
  const t = useTheme();
  return (
    <Text numberOfLines={numberOfLines} style={[type[`title${size}`], { color: t.ink }, style]}>
      {children}
    </Text>
  );
};

export const Body = ({ children, style, muted, numberOfLines, ui }) => {
  const t = useTheme();
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[ui ? type.ui : type.body, { color: muted ? t.inkMuted : t.ink }, style]}
    >
      {children}
    </Text>
  );
};

/**
 * Buttons: "filled" (brick, one per view), "outline", "ghost" (text only).
 */
export const Button = ({ title, onPress, variant = 'filled', icon, loading, disabled, style, compact }) => {
  const t = useTheme();
  const filled = variant === 'filled';
  const outline = variant === 'outline';
  const fg = filled ? t.onBrick : outline ? t.ink : t.brick;
  return (
    <Pressable
      onPress={(e) => {
        tap();
        onPress && onPress(e);
      }}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: space[2],
          minHeight: compact ? 36 : 48,
          paddingHorizontal: compact ? space[3] : space[5],
          borderRadius: radius.sm,
          backgroundColor: filled ? (pressed ? t.brickDeep : t.brick) : pressed ? t.paperSunken : 'transparent',
          borderWidth: outline ? 1 : 0,
          borderColor: t.edge,
          opacity: disabled ? 0.45 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : icon ? (
        <Ionicons name={icon} size={18} color={fg} />
      ) : null}
      {title ? <Text style={[type.uiSemi, { color: fg }]}>{title}</Text> : null}
    </Pressable>
  );
};

export const IconButton = ({ icon, onPress, color, size = 22, style, accessibilityLabel, active }) => {
  const t = useTheme();
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      onPress={(e) => {
        tap();
        onPress && onPress(e);
      }}
      style={({ pressed }) => [
        {
          width: 40,
          height: 40,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: radius.sm,
          backgroundColor: pressed || active ? t.paperSunken : 'transparent',
        },
        style,
      ]}
    >
      <Ionicons name={icon} size={size} color={color || (active ? t.brick : t.ink)} />
    </Pressable>
  );
};

export const Field = ({ label, hint, style, inputStyle, right, ...props }) => {
  const t = useTheme();
  const [focused, setFocused] = React.useState(false);
  return (
    <View style={[{ gap: space[2] }, style]}>
      {label ? <Label>{label}</Label> : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: t.paperRaised,
          borderWidth: focused ? 2 : 1,
          borderColor: focused ? t.dusk : t.rule,
          borderRadius: radius.sm,
          paddingHorizontal: focused ? space[3] - 1 : space[3],
        }}
      >
        <TextInput
          placeholderTextColor={t.inkFaint}
          selectionColor={t.brick}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[type.ui, { flex: 1, color: t.ink, minHeight: 46, paddingVertical: space[2] }, inputStyle]}
          {...props}
        />
        {right}
      </View>
      {hint ? <Text style={[type.caption, { color: t.inkMuted }]}>{hint}</Text> : null}
    </View>
  );
};

/**
 * Segmented control with a brick underline on the selected option.
 */
export const Tabs = ({ options, value, onChange, style }) => {
  const t = useTheme();
  return (
    <View style={[{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: t.rule }, style]}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => {
              tap();
              onChange(o.value);
            }}
            style={{
              paddingVertical: space[3],
              marginRight: space[5],
              borderBottomWidth: 2,
              borderBottomColor: selected ? t.brick : 'transparent',
              marginBottom: -1,
            }}
          >
            <Text style={[type.label, { color: selected ? t.ink : t.inkMuted }]}>
              {o.label}
              {o.count != null ? `  ${o.count}` : ''}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

/**
 * Choice pills: a row of selectable options (status, visibility...).
 */
export const Choice = ({ options, value, onChange }) => {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => {
              tap();
              onChange(o.value);
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: space[2],
              paddingHorizontal: space[3],
              minHeight: 40,
              borderRadius: radius.sm,
              borderWidth: 1,
              borderColor: selected ? t.ink : t.rule,
              backgroundColor: selected ? t.ink : t.paperRaised,
            }}
          >
            {o.icon ? <Ionicons name={o.icon} size={16} color={selected ? t.paper : t.inkMuted} /> : null}
            <Text style={[type.uiSemi, { fontSize: 14, color: selected ? t.paper : t.ink }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
};

/**
 * Bottom sheet built on Modal.
 */
export const Sheet = ({ visible, onClose, title, children, footer }) => {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <Pressable style={{ flex: 1, backgroundColor: t.scrim }} onPress={onClose} />
        <View
          style={{
            backgroundColor: t.paper,
            borderTopWidth: 2,
            borderTopColor: t.ink,
            maxHeight: '88%',
            paddingBottom: Math.max(insets.bottom, space[4]),
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: space[4],
              paddingTop: space[4],
              paddingBottom: space[2],
            }}
          >
            <Title size="S">{title}</Title>
            <IconButton icon="close" onPress={onClose} accessibilityLabel="Close" />
          </View>
          {children}
          {footer ? <View style={{ paddingHorizontal: space[4], paddingTop: space[3] }}>{footer}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export const Rule = ({ strong, style }) => {
  const t = useTheme();
  return <View style={[{ height: strong ? 2 : StyleSheet.hairlineWidth * 2, backgroundColor: strong ? t.ink : t.rule }, style]} />;
};

/**
 * Callout box: note (dusk), caveat (amber), critique/error (brick).
 */
export const Callout = ({ kind = 'note', title, children, style }) => {
  const t = useTheme();
  const bg = kind === 'caveat' ? t.amberTint : kind === 'error' ? t.brickTint : t.duskTint;
  return (
    <View style={[{ backgroundColor: bg, borderRadius: radius.md, padding: space[4], gap: space[1] }, style]}>
      {title ? <Text style={[type.uiSemi, { color: t.ink }]}>{title}</Text> : null}
      <Text style={[type.caption, { color: t.ink, fontSize: 14, lineHeight: 20 }]}>{children}</Text>
    </View>
  );
};

export { fonts };
