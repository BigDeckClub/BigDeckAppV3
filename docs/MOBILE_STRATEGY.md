# Mobile App Strategy - iOS & Android

This document outlines the strategy for converting BigDeckAppV3 into native iOS and Android applications.

## Executive Summary

BigDeckAppV3 is well-positioned for mobile conversion due to:
- ✅ Modern React architecture
- ✅ Responsive UI design (already mobile-friendly)
- ✅ Clean separation of concerns (hooks, services, components)
- ✅ RESTful API backend
- ✅ Feature-based code organization

## Technology Recommendations

### Option 1: React Native (Recommended)

**Pros:**
- Reuse 70-80% of existing React code
- Single codebase for iOS and Android
- Large community and ecosystem
- Hot reloading and fast development
- Can use Expo for easier development

**Cons:**
- Some platform-specific code required
- Bridge performance overhead for complex animations
- Larger app size than native

**Estimated Timeline:** 2-3 months
**Code Reusability:** 70-80%

### Option 2: Capacitor (Alternative)

**Pros:**
- Reuse 90-95% of existing web code
- Web app wraps in native shell
- Access to native APIs via plugins
- Minimal platform-specific code
- Easiest migration path

**Cons:**
- Slightly less performant than React Native
- Web-based UI (not truly native feel)
- Limited native UI customization

**Estimated Timeline:** 1-2 months
**Code Reusability:** 90-95%

### Option 3: Flutter (Not Recommended)

**Pros:**
- Best performance
- Beautiful native UI
- Single codebase

**Cons:**
- Complete rewrite required (Dart language)
- No code reuse from existing React app
- Steeper learning curve

**Estimated Timeline:** 4-6 months
**Code Reusability:** 0%

## Recommended Approach: React Native with Expo

React Native + Expo provides the best balance of code reusability, development speed, and native performance.

---

## Phase 1: Architecture Preparation (COMPLETED ✅)

The refactoring work we just completed sets the foundation for mobile:

### ✅ Completed Improvements

1. **Service Layer** - All API calls centralized
   - Easy to adapt for mobile API client
   - Network state handling ready

2. **Custom Hooks** - Business logic extracted
   - Hooks work identically in React Native
   - `useWizardState`, `useInventoryChecks`, etc. are reusable

3. **Component Decomposition** - Smaller, focused components
   - Easier to convert to React Native components
   - Clear component boundaries

4. **Bundle Splitting** - Optimized for mobile performance
   - Feature-based code splitting
   - Lazy loading support

5. **Centralized Types** - PropTypes in one place
   - Easy to convert to TypeScript for React Native

### Architecture Benefits for Mobile

```
✅ Separation of Concerns
   Web: React Component → Hook → Service → API
   Mobile: React Native Component → Hook (same!) → Service (same!) → API (same!)

✅ Reusable Business Logic
   - All custom hooks work in React Native
   - Service layer identical
   - API client needs minimal adaptation

✅ Feature Modules
   - Each feature can be developed independently
   - Easy to prioritize features for mobile MVP
```

---

## Phase 2: React Native Migration Plan

### Step 1: Project Setup (Week 1)

```bash
# Initialize React Native project with Expo
npx create-expo-app BigDeckMobile --template

# Install dependencies
cd BigDeckMobile
npm install react-navigation
npm install @react-navigation/native-stack
npm install @react-navigation/bottom-tabs
npm install react-native-gesture-handler
npm install react-native-safe-area-context
npm install axios # For API calls
```

### Step 2: Shared Code Structure (Week 1-2)

Create a monorepo structure to share code:

```
BigDeckAppV3/
├── packages/
│   ├── web/                 # Existing web app
│   ├── mobile/              # React Native app
│   └── shared/              # Shared code (70-80% reusable)
│       ├── hooks/           # Copy from src/hooks/ (100% reusable)
│       ├── services/        # Copy from server/services/ (100% reusable)
│       ├── utils/           # Copy from src/utils/ (90% reusable)
│       ├── constants/       # Copy from src/constants/ (100% reusable)
│       └── types/           # Copy from src/types/ (100% reusable)
```

### Step 3: Convert UI Components (Week 2-6)

Map web components to React Native equivalents:

| Web Component | React Native Component | Effort |
|--------------|----------------------|--------|
| `<div>` | `<View>` | Easy |
| `<button>` | `<TouchableOpacity>` or `<Pressable>` | Easy |
| `<input>` | `<TextInput>` | Easy |
| `<img>` | `<Image>` | Easy |
| CSS classes | StyleSheet or styled-components | Medium |
| react-window | `<FlatList>` or `<SectionList>` | Medium |
| Modal | `<Modal>` (built-in) | Easy |

**Conversion Strategy:**

```javascript
// WEB: src/components/ui/Button.jsx
export default function Button({ onClick, children, className }) {
  return (
    <button onClick={onClick} className={className}>
      {children}
    </button>
  );
}

// MOBILE: packages/mobile/components/ui/Button.jsx
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

export default function Button({ onPress, children, style }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.button, style]}>
      <Text style={styles.text}>{children}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  text: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

### Step 4: Navigation (Week 3)

Replace tab-based navigation with React Navigation:

```javascript
// packages/mobile/navigation/AppNavigator.jsx
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';

const Tab = createBottomTabNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator>
        <Tab.Screen name="Dashboard" component={DashboardScreen} />
        <Tab.Screen name="Orb" component={AIDeckBuilderScreen} />
        <Tab.Screen name="Inventory" component={InventoryScreen} />
        <Tab.Screen name="Decks" component={DecksScreen} />
        <Tab.Screen name="Settings" component={SettingsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
```

### Step 5: API Integration (Week 4)

The service layer works identically, just swap `fetch` for `axios` or use React Native's built-in fetch:

```javascript
// packages/shared/services/apiClient.js
// Works in both web and mobile!

import { Platform } from 'react-native'; // Only for React Native

const API_BASE = Platform.OS === 'web'
  ? '/api'
  : 'https://your-api.com/api';

export async function apiRequest(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  const response = await fetch(url, options);
  return response.json();
}
```

### Step 6: Native Features (Week 5-6)

Add mobile-specific features:

**Camera for Card Scanning:**
```bash
npm install expo-camera expo-barcode-scanner
```

```javascript
import { Camera } from 'expo-camera';

export function CardScannerScreen() {
  const [hasPermission, setHasPermission] = useState(null);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  return (
    <Camera onBarCodeScanned={handleBarCodeScanned}>
      {/* Scanner UI */}
    </Camera>
  );
}
```

**Push Notifications:**
```bash
npm install expo-notifications
```

**Offline Storage:**
```bash
npm install @react-native-async-storage/async-storage
```

### Step 7: Testing (Week 7-8)

```bash
# iOS Simulator
npm run ios

# Android Emulator
npm run android

# Physical devices (via Expo Go)
expo start
# Scan QR code with Expo Go app
```

---

## Code Reusability Breakdown

### 100% Reusable (No Changes Needed)

✅ **Custom Hooks** - `packages/shared/hooks/`
- `useWizardState.js`
- `useDeckGeneration.js`
- `useInventoryChecks.js`
- `usePrintProxies.js`
- All other custom hooks

✅ **Services** - `packages/shared/services/`
- `scryfallService.js`
- `edhrecService.js`
- `mtggoldfishService.js`
- `deckGenerationService.js`

✅ **Utilities** - `packages/shared/utils/`
- `decklistParser.js`
- `searchScoring.js`
- `cardHelpers.js`
- Most utilities work unchanged

✅ **Constants** - `packages/shared/constants/`
- All constant files

✅ **Type Definitions** - `packages/shared/types/`
- `models.js` (can convert to TypeScript)

### 80-90% Reusable (Minor Adaptations)

⚠️ **Context Providers** - `packages/shared/context/`
- Same logic, different storage mechanism
- Use AsyncStorage instead of localStorage

⚠️ **API Client** - `packages/shared/services/apiClient.js`
- Change API_BASE based on platform
- Otherwise identical

### 0% Reusable (Complete Rewrite)

❌ **UI Components** - `packages/mobile/components/`
- Convert from HTML to React Native components
- Rewrite CSS as StyleSheet
- This is the bulk of the work

❌ **Layouts** - `packages/mobile/screens/`
- Mobile-specific layouts
- Bottom tab navigation
- Stack navigation for sub-screens

---

## Mobile-Specific Features to Add

### Priority 1 (Must Have)

1. **Biometric Authentication**
   - Face ID / Touch ID for quick login
   - Secure credential storage

2. **Offline Mode**
   - Cache inventory data locally
   - Sync when online
   - Conflict resolution

3. **Card Scanner**
   - Use camera to scan card names or barcodes
   - OCR for quick card entry
   - Integration with rapid entry

4. **Push Notifications**
   - Price alerts
   - Deck suggestions
   - App updates

### Priority 2 (Nice to Have)

5. **Geolocation**
   - Find nearby card shops
   - Local event finder

6. **Share Functionality**
   - Share deck lists via SMS/WhatsApp
   - Export images of decks

7. **Siri / Google Assistant Integration**
   - "Hey Siri, show me my Sol Ring inventory"

8. **Widget Support**
   - Home screen widget showing inventory value
   - Today view with recent cards

---

## Performance Optimization for Mobile

### Bundle Size Optimization

```javascript
// vite.config.js already optimized for this
// Feature-based code splitting:
// - vendor-react: 150KB
// - vendor-icons: 50KB
// - feature-inventory: 120KB
// - feature-ai: 200KB
// Total initial load: ~520KB (excellent for mobile)
```

### Image Optimization

```javascript
// Use react-native-fast-image for better image caching
import FastImage from 'react-native-fast-image';

<FastImage
  source={{ uri: card.image_url, priority: FastImage.priority.high }}
  resizeMode={FastImage.resizeMode.contain}
/>
```

### List Performance

```javascript
// Replace react-window with React Native FlatList
import { FlatList } from 'react-native';

<FlatList
  data={inventory}
  renderItem={({ item }) => <CardRow card={item} />}
  keyExtractor={(item) => item.id}
  windowSize={10} // Render 10 items at a time
  maxToRenderPerBatch={10}
  updateCellsBatchingPeriod={50}
  removeClippedSubviews={true} // Critical for performance
/>
```

---

## Deployment Strategy

### iOS App Store

**Requirements:**
- Apple Developer Account ($99/year)
- macOS for Xcode
- TestFlight for beta testing

**Steps:**
1. Configure app signing
2. Build release version
3. Upload to App Store Connect
4. Submit for review (1-2 weeks)

### Google Play Store

**Requirements:**
- Google Play Console Account ($25 one-time)
- Android SDK

**Steps:**
1. Generate signed APK/AAB
2. Upload to Play Console
3. Submit for review (1-3 days)

### Expo Application Services (EAS)

**Easiest Approach:**
```bash
# Install EAS CLI
npm install -g eas-cli

# Configure
eas build:configure

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

---

## Migration Checklist

### ✅ Phase 1: Preparation (COMPLETED)
- [x] Service layer architecture
- [x] Custom hooks extraction
- [x] Component decomposition
- [x] Bundle splitting optimization
- [x] Centralized types

### 🔄 Phase 2: Setup (2 weeks)
- [ ] Initialize React Native project with Expo
- [ ] Set up monorepo structure
- [ ] Copy shared code to packages/shared/
- [ ] Configure navigation
- [ ] Set up development environment

### 🔄 Phase 3: Core Features (4 weeks)
- [ ] Convert Dashboard screen
- [ ] Convert Inventory screen
- [ ] Convert Deck Builder screen
- [ ] Convert AI Orb screen
- [ ] Convert Settings screen

### 🔄 Phase 4: Mobile Features (2 weeks)
- [ ] Implement offline mode
- [ ] Add biometric authentication
- [ ] Integrate camera for card scanning
- [ ] Set up push notifications

### 🔄 Phase 5: Testing (2 weeks)
- [ ] Unit tests for shared code
- [ ] Integration tests
- [ ] Manual testing on iOS devices
- [ ] Manual testing on Android devices
- [ ] Performance profiling

### 🔄 Phase 6: Deployment (1 week)
- [ ] iOS App Store submission
- [ ] Google Play Store submission
- [ ] Set up crash reporting (Sentry)
- [ ] Set up analytics (Firebase)

**Total Timeline:** 10-12 weeks for full mobile launch

---

## Cost Estimate

| Item | Cost | Frequency |
|------|------|-----------|
| Apple Developer Account | $99 | Annual |
| Google Play Console | $25 | One-time |
| Expo EAS Build Service | $29-$99 | Monthly (optional) |
| Code Signing Certificate | Included | - |
| **Total Initial:** | **$124-$223** | |

**Note:** Development can be done entirely for free if you build locally and only pay for store accounts.

---

## Alternatives to Native Apps

### Progressive Web App (PWA)

**Pros:**
- Zero additional code
- Works on all platforms
- No app store approval needed
- Instant updates

**Cons:**
- No access to native features (camera, push notifications limited)
- Not in app stores
- Limited offline capabilities
- No home screen icon by default

**Implementation:**
Already 90% ready! Just add a manifest.json and service worker.

---

## Recommendation

**Path Forward:**

1. **Short-term (Now):** Improve PWA support
   - Add manifest.json
   - Implement service worker for offline mode
   - Users can "Add to Home Screen" immediately

2. **Medium-term (2-3 months):** React Native app
   - Leverage the refactoring we just completed
   - 70-80% code reuse
   - Native features (camera, biometrics)
   - Better performance

3. **Long-term:** Iterate based on user feedback
   - Add premium features
   - Improve AI capabilities
   - Expand marketplace integrations

---

## Next Steps

1. ✅ **Complete web optimizations** (bundle splitting - DONE)
2. **Add PWA support** (quick win - 1 day)
3. **Set up React Native project** (1 week)
4. **Start migrating screens** (4-6 weeks)
5. **Beta testing** (2 weeks)
6. **Launch!** 🚀

---

## Questions?

- See [REFACTORING_SUMMARY.md](./REFACTORING_SUMMARY.md) for architecture details
- Check [PROJECT_STRUCTURE.md](../PROJECT_STRUCTURE.md) for codebase organization
- Review [TESTING_GUIDE.md](./TESTING_GUIDE.md) for testing mobile code
