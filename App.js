import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  FiraSansCondensed_600SemiBold,
  FiraSansCondensed_700Bold,
} from '@expo-google-fonts/fira-sans-condensed';
import { FiraSans_400Regular, FiraSans_600SemiBold } from '@expo-google-fonts/fira-sans';
import {
  SourceSerif4_400Regular,
  SourceSerif4_400Regular_Italic,
  SourceSerif4_600SemiBold,
} from '@expo-google-fonts/source-serif-4';
import { HomeScreen } from './src/screens/HomeScreen';
import { EditorScreen } from './src/screens/EditorScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { useTheme } from './src/theme';

const Stack = createStackNavigator();

export default function App() {
  const t = useTheme();
  const [fontsLoaded] = useFonts({
    FiraSansCondensed_600SemiBold,
    FiraSansCondensed_700Bold,
    FiraSans_400Regular,
    FiraSans_600SemiBold,
    SourceSerif4_400Regular,
    SourceSerif4_400Regular_Italic,
    SourceSerif4_600SemiBold,
  });

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(t.paper).catch(() => {});
  }, [t.paper]);

  const base = t.mode === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      primary: t.brick,
      background: t.paper,
      card: t.paper,
      text: t.ink,
      border: t.rule,
    },
  };

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: t.paper }} />;
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={navTheme}>
        <StatusBar style={t.mode === 'dark' ? 'light' : 'dark'} />
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            cardStyle: { backgroundColor: t.paper },
            gestureEnabled: true,
            cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
          }}
        >
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Editor" component={EditorScreen} />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{ cardStyleInterpolator: CardStyleInterpolators.forVerticalIOS }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
