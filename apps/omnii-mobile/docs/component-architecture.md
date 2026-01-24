# Component Architecture Documentation

## Overview

The Omnii Mobile app uses a modular component architecture with TypeScript path aliases. Components are organized by feature and shared functionality, making the codebase scalable and maintainable.

## Path Alias Configuration

The app uses the `@/` path alias configured in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

This allows clean imports throughout the app:
- `@/components/` - UI components
- `@/hooks/` - Custom React hooks
- `@/context/` - React Context providers
- `@/constants/` - App constants and configuration
- `~/types/` - TypeScript type definitions

## Component Structure

### 1. Feature Components (`/components/[feature]/`)

Components are organized by feature area:

- **achievements/** - Achievement cards and gamification UI
- **analytics/** - Data visualization and insights
- **approvals/** - Swipeable approval cards and gestures
- **auth/** - Authentication flows and OAuth debugging
- **profile/** - User profile and work style assessment
- **landing/** - Landing page components

### 2. Common Components (`/components/common/`)

Shared UI components used across features:

- **Typography.tsx** - Consistent text styling
- **OmniiLogo.tsx** - Brand identity component
- **SwipeableCard.tsx** - Reusable swipe gesture wrapper
- **AIInsightsBanner.tsx** - AI feedback displays
- **GestureProvider.tsx** - Gesture handling context
- **UndoSnackbar.tsx** - Action feedback
- **VoiceFeedbackModal.tsx** - Voice interaction UI

### 3. Component Patterns

#### Tab-Based Navigation Pattern
Used in profile.tsx, chat.tsx, and analytics.tsx:

```typescript
const tabs: TabConfig[] = [
  {
    key: 'overview',
    label: 'Overview',
    icon: '📊',
    gradient: [AppColors.primary, AppColors.secondary]
  },
  // ... more tabs
];
```

Features:
- Animated tab switching with shimmer effects
- Gradient backgrounds for active states
- Consistent styling across all tabbed views

#### Card Component Pattern
All cards follow a consistent structure:

```typescript
interface CardProps {
  data: SpecificDataType;
  onPress?: () => void;
  onSwipe?: (direction: 'left' | 'right') => void;
}
```

Common features:
- Press animations using Animated API
- Shadow effects from `AppColors.shadows`
- Consistent padding and border radius

#### Authentication-Aware Components
Components check authentication status:

```typescript
const { user } = useAuth();

if (!user) {
  return <EmptyState message="Please log in" />;
}
```

## How Components Are Used in App Routes

### Route Structure (`/app/`)

The app uses file-based routing with Expo Router:

1. **Tab Navigation** (`/app/(tabs)/`)
   - Each tab screen imports and uses multiple components
   - Example: `chat.tsx` uses:
     - Common components for UI consistency
     - Chat-specific components for messages
     - Shared patterns for tabs and animations

2. **Authentication Flow** (`/app/(auth)/`)
   - Uses auth components for login/register
   - Integrates `GoogleSignInButton` component
   - Debug screens use `OAuthDebugger` and `ScopeDebugger`

3. **Dynamic Routes** (`/app/request/[id].tsx`)
   - Uses approval components to display request details
   - Integrates swipe gestures for quick actions

### Component Integration Example

Here's how components are integrated in `chat.tsx`:

```typescript
import { useAuth } from '@/context/AuthContext';
import { useFetchChat } from '@/hooks/useFetchChat';
import { AppColors } from '@/constants/Colors';
import type { ChatMessage } from '~/types/chat';

// The screen combines:
// 1. Authentication context
// 2. Data fetching hooks
// 3. Type-safe interfaces
// 4. Consistent styling
// 5. Reusable UI patterns
```

## Best Practices

1. **Import Organization**
   - React/RN imports first
   - External libraries second
   - Internal imports last (using @/ alias)

2. **Component Composition**
   - Keep components focused on single responsibility
   - Extract reusable logic into hooks
   - Use TypeScript for prop validation

3. **Styling Consistency**
   - Always use AppColors constants
   - Apply shadows using AppColors.shadows
   - Follow established spacing patterns

4. **Performance**
   - Use React.memo for expensive components
   - Implement proper loading states
   - Handle errors gracefully

## Adding New Components

When creating new components:

1. Place in appropriate feature folder or common/
2. Follow existing naming conventions
3. Include TypeScript interfaces
4. Use consistent styling patterns
5. Add proper loading and error states
6. Ensure authentication awareness if needed

## Component Dependencies

Key dependencies used across components:

- **react-native-gesture-handler** - Swipe gestures
- **react-native-reanimated** - Smooth animations
- **react-native-svg** - Gradient effects
- **lucide-react-native** - Consistent iconography
- **expo-router** - Navigation integration