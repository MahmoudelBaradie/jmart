# Jmart Mobile App — جمارت للجوال

A complete cross-platform mobile app (iOS + Android) for the Jmart agricultural marketplace, built with Expo SDK 51 and Expo Router.

## Requirements

- Node.js 18+
- npm or yarn
- Expo CLI: `npm install -g expo-cli`
- For iOS: macOS with Xcode 15+
- For Android: Android Studio with an emulator, or a physical device

## Getting Started

```bash
cd apps/mobile
npm install
npx expo start
```

Then press:
- `i` to open on iOS Simulator (macOS only)
- `a` to open on Android Emulator
- `w` to open in the browser (limited functionality)
- Scan the QR code with the Expo Go app on your physical device

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start the Expo dev server |
| `npm run android` | Start with Android target |
| `npm run ios` | Start with iOS target |
| `npm run web` | Start with web target |

## Architecture

### Stack
- **Expo SDK 51** — Core runtime
- **Expo Router 3.5** — File-based routing (similar to Next.js App Router)
- **React Query (@tanstack/react-query)** — Server state management with caching
- **Axios** — HTTP client with auth token interceptor
- **expo-secure-store** — Encrypted token storage
- **expo-notifications** — Push notifications support

### File Structure

```
apps/mobile/
├── app/
│   ├── _layout.tsx          # Root layout: providers (QueryClient, Auth, GestureHandler)
│   ├── index.tsx            # Entry: redirects to tabs or login based on auth state
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── login.tsx        # Login screen with email/password
│   │   └── register.tsx     # Registration with role selection (FARMER/BUYER)
│   ├── (tabs)/
│   │   ├── _layout.tsx      # Tab bar (role-aware: marketplace for buyers, listings for farmers)
│   │   ├── index.tsx        # Home/Dashboard with stats and recent orders
│   │   ├── marketplace.tsx  # Buyer: browse market lots with search + pagination
│   │   ├── listings.tsx     # Farmer: own inventory listings
│   │   ├── orders.tsx       # Orders list with status filters
│   │   ├── contracts.tsx    # Contracts list
│   │   ├── notifications.tsx # Notifications tab with unread badge
│   │   └── profile.tsx      # User profile and settings
│   ├── lot/[id].tsx         # Marketplace lot detail + order placement
│   ├── order/[id].tsx       # Order detail with timeline, cancel, rate
│   ├── contract/[id].tsx    # Contract detail with parties and items
│   ├── notifications.tsx    # Standalone notifications screen
│   ├── financial.tsx        # Financial summary + invoices
│   └── disputes.tsx         # Disputes list
├── components/
│   ├── ui/
│   │   ├── Button.tsx       # Primary/secondary/danger/ghost variants
│   │   ├── Card.tsx         # Shadow card container
│   │   ├── Input.tsx        # RTL text input with label and error
│   │   ├── Badge.tsx        # Status badge with color coding
│   │   └── LoadingSpinner.tsx
│   └── shared/
│       ├── StatusBadge.tsx
│       └── EmptyState.tsx
├── hooks/
│   ├── useAuth.ts           # AuthContext: login/logout/user state
│   └── useNotifications.ts  # Notification queries and mutations
├── lib/
│   ├── api.ts               # Axios instance + all API call functions
│   ├── storage.ts           # SecureStore wrapper
│   └── utils.ts             # formatDate, formatCurrency, STATUS_COLORS
├── app.json                 # Expo config
├── babel.config.js
├── tsconfig.json
└── package.json
```

## API Configuration

The API base URL is set in `lib/api.ts`:

```typescript
const API_URL = 'http://localhost:3000/api/v1';
```

For physical device testing, replace `localhost` with your machine's local IP address (e.g., `http://192.168.1.x:3000/api/v1`).

## Features

### Authentication
- JWT token stored securely via expo-secure-store
- Auto-login on app open if valid token exists
- Role-based routing (FARMER vs BUYER)
- Registration with business details

### Role-Aware UI
- **Buyers**: see Marketplace tab to browse and order lots
- **Farmers**: see My Listings tab to manage their products
- Both roles share: Home, Orders, Contracts, Notifications, Profile

### Screens
- **Home**: Dashboard with financial stats, recent orders, quick actions
- **Marketplace** (buyer): Searchable product listing with infinite scroll
- **Lot Detail**: Product info, quantity selector, order placement
- **My Listings** (farmer): Own inventory with status filters
- **Orders**: Filterable order list; detail with vertical timeline
- **Order Detail**: Status timeline, item breakdown, cancel/rate actions
- **Contracts**: Contract list and full detail view with parties
- **Notifications**: Mark read / mark all read; unread badge in tab bar
- **Financial**: Revenue summary + invoice list
- **Disputes**: Dispute list with status tracking
- **Profile**: User info, quick links, logout

### UX Details
- Full RTL (Arabic) layout via `I18nManager.forceRTL(true)`
- Pull-to-refresh on all list screens
- Green primary color (#16a34a) throughout
- Skeleton-free loading spinners
- Empty state illustrations
- Status badges with color-coded labels in Arabic

## Building for Production

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure builds
eas build:configure

# Build for Android (APK)
eas build --platform android --profile preview

# Build for iOS (requires Apple Developer account)
eas build --platform ios --profile preview
```
