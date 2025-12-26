# SpecterPost

A modern mobile app for writing and publishing to **Ghost CMS** and **WordPress**, built with React Native and Expo. Designed for writers, content creators, academics, and data researchers who need to publish rich content on the go.

## ✨ Features

### Dual-Platform Publishing
- **Ghost CMS** – Full Admin API integration with Lexical/Koenig editor support
- **WordPress** – REST API with Application Passwords authentication

### Rich Content Editor
- Minimalistic distraction-free writing experience
- Image insertion with automatic compression
- Tag management with autocomplete
- Draft auto-save to local storage
- Featured image support

### Specter Architecture
Direct API communication with no middleware required:
- JWT tokens signed on-device for Ghost
- Basic Auth for WordPress Application Passwords
- Secure credential storage using Expo SecureStore
- All authentication happens locally

### Offline-First
- Create and save drafts locally
- Sync when connected
- SQLite-backed local database

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│           SpecterPost App               │
│         (React Native + Expo)           │
└────────────────┬────────────────────────┘
                 │
    ┌────────────┴────────────┐
    ▼                         ▼
┌─────────────┐       ┌─────────────────┐
│  Ghost CMS  │       │    WordPress    │
│ (Admin API) │       │   (REST API)    │
│   + Lexical │       │  + App Password │
└─────────────┘       └─────────────────┘
```

**Key Design Principles:**
- **No Middleware** – Credentials never leave the device
- **On-Device JWT** – Ghost tokens signed locally with `jose`
- **Secure Storage** – API keys in Expo SecureStore
- **Graceful Fallbacks** – Works offline with local drafts

## 📁 Project Structure

```
SpecterPost/
├── App.js                    # Navigation with Stack Navigator
├── package.json              # Expo 54, React Native 0.81.5
├── src/
│   ├── components/           # Reusable UI
│   │   ├── Button.js         # Styled button variants
│   │   ├── Card.js           # Content card wrapper
│   │   ├── Input.js          # Form input with labels
│   │   ├── RichTextEditor.js # WebView-based editor
│   │   ├── TagSelector.js    # Tag autocomplete
│   │   └── index.js          # Component exports
│   ├── constants/
│   │   ├── theme.js          # Colors, typography, spacing
│   │   └── htmlTemplates.js  # Pre-built HTML snippets
│   ├── screens/
│   │   ├── HomeScreen.js     # Posts list (drafts + published)
│   │   ├── DraftsScreen.js   # Local drafts management
│   │   ├── EditorScreen.js   # Post editor with toolbar
│   │   └── SettingsScreen.js # Platform configuration
│   └── services/
│       ├── api.js            # Unified API layer
│       ├── authService.js    # JWT signing, Basic Auth
│       ├── ghostService.js   # Ghost Admin API client
│       ├── wordpressService.js # WordPress REST client
│       ├── mediaService.js   # Image/video compression
│       ├── imageService.js   # Image manipulation
│       ├── storage.js        # AsyncStorage + SecureStore
│       └── db.js             # SQLite for local data
```

## 🛠️ Technology Stack

| Category | Technology | Version |
|----------|------------|---------|
| Framework | React Native | 0.81.5 |
| Platform | Expo | 54 |
| React | React | 19.1.0 |
| Navigation | React Navigation (Stack) | 7.x |
| JWT | jose | 6.1.3 |
| Image Compression | react-native-compressor | 1.13.0 |
| Rich Text | react-native-pell-rich-editor | 1.10.0 |
| Storage | @react-native-async-storage/async-storage | 2.2.0 |
| Secure Storage | expo-secure-store | 15.x |
| Database | expo-sqlite | 16.x |
| Icons | @expo/vector-icons (Ionicons) | 15.x |

## 🚀 Getting Started

### Prerequisites
- Node.js 20+ 
- npm or yarn
- Android Studio (for Android) or Expo Go app

### Installation

```bash
cd SpecterPost
npm install
npm start
```

### Running on Device

```bash
# Android
npm run android

# Or scan QR code with Expo Go
```

## ⚙️ Configuration

### Ghost CMS

1. Go to **Ghost Admin** → **Settings** → **Integrations**
2. Create a **Custom Integration**
3. Copy the **Admin API Key** (format: `id:secret`)
4. In the app: **Settings** → Enter Ghost URL and Admin Key

### WordPress

1. Go to **WordPress Admin** → **Users** → **Profile**
2. Scroll to **Application Passwords**
3. Create a new password for SpecterPost
4. In the app: **Settings** → Enter Site URL, Username, and App Password

## 📱 Screens

| Screen | Description |
|--------|-------------|
| **Home** | Lists local drafts and published posts with featured images |
| **Editor** | Distraction-free writing with floating toolbar, image support, tags |
| **Drafts** | Manage offline drafts, delete, or resume editing |
| **Settings** | Configure Ghost/WordPress, test connections, view app info |

## 🔐 Security

- **On-Device Auth** – JWT tokens generated locally, never sent to third parties
- **SecureStore** – API keys encrypted in native secure storage
- **No Middleware** – Direct communication with your CMS
- **No Telemetry** – Your content stays private

## 🚧 Known Issues & Roadmap

### Current Issues
- [ ] Image picker may fail on some Android 14 devices with specific permission configurations
- [ ] Large posts (>50KB HTML) may have slow initial render in editor
- [ ] WordPress tag creation not fully implemented (tags must exist)
- [ ] No scheduled post support for WordPress

### Planned Features
- [ ] iOS support and App Store release
- [ ] Markdown editor mode toggle
- [ ] Image gallery grid in editor
- [ ] Post scheduling with date picker
- [ ] Multi-account support
- [ ] Dark mode
- [ ] Post search and filtering
- [ ] Export/import local drafts
- [ ] Media library browser
- [ ] Custom HTML block insertion

### Technical Debt
- [ ] Add comprehensive error boundaries
- [ ] Implement proper loading skeletons
- [ ] Add unit tests for services
- [ ] Migrate to TypeScript
- [ ] Refactor editor to use ContentEditable instead of WebView

## 📄 License

MIT

## 🙏 Credits

- Ghost CMS for the Koenig/Lexical editor inspiration
- The Expo team for the excellent development platform
- React Native community for the rich ecosystem

---

**SpecterPost** – *Write anywhere. Publish everywhere.*
