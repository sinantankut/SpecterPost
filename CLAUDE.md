# SpecterPost

Expo (SDK 54, React Native 0.81) app for writing and publishing to any Ghost 5 site through the Admin API. No backend: the Admin API key is stored with expo-secure-store and JWTs are signed on device (`src/services/authService.js`).

## Layout
- `App.js`: font loading, navigation (Home, Editor, Settings), light/dark theme.
- `src/theme/index.js`: design tokens ("paper and ink": paper ground, ink text, one brick accent, Fira Sans Condensed titles, Source Serif 4 body). Use `useTheme()`; do not hardcode colours.
- `src/ui/index.js`: shared primitives (Button, IconButton, Field, Tabs, Choice, Sheet, Callout, Rule).
- `src/screens/`: HomeScreen (drafts/scheduled/published), EditorScreen (cover, title, subtitle, body, publish sheet), SettingsScreen (connect a Ghost site).
- `src/components/RichTextEditor.js`: WebView editor (react-native-pell-rich-editor), toolbar, and media inserts that upload to Ghost (`/images/upload`, `/media/upload`, `/files/upload`).
- `src/services/`: Ghost and WordPress API clients, SQLite local drafts (`db.js`, with a `db.web.js` fallback for browser previews).

## Commands
- `npx expo start` to run in development.
- `npx expo export --platform android` checks that the JS bundle compiles.
- APK: GitHub Actions workflow `.github/workflows/android-apk.yml` runs `expo prebuild` and `gradlew assembleRelease` (debug-signed, for sideloading) and uploads the APK as an artifact. `android/` is generated and gitignored.
