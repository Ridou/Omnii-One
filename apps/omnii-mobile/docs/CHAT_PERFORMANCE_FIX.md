# Chat Performance Fix Guide

## Issue: Typing Slowness in Chat

### Potential Causes Identified:

1. **Heavy Re-renders on Each Keystroke**
   - `setMessageInput` triggers re-renders of the entire chat component
   - Heavy components like task lists, calendar views re-render unnecessarily

2. **Complex State Updates**
   - Multiple hooks updating simultaneously
   - Excessive data fetching during typing

3. **Unoptimized Child Components**
   - Rich UI components re-rendering on parent state changes

## Solution: React Performance Optimizations

### 1. Memoize Heavy Components

```tsx
// apps/omnii-mobile/src/app/(tabs)/chat.tsx

import React, { memo } from 'react';

// Memoize heavy components to prevent unnecessary re-renders
const MemoizedConversationContent = memo(ConversationContent);
const MemoizedActionsContent = memo(ActionsContent);
const MemoizedReferencesContent = memo(ReferencesContent);
const MemoizedMemoryContent = memo(MemoryContent);

// Use memoized components in renderTabContent
const renderTabContent = () => {
  switch (selectedTab) {
    case 'conversation':
      return <MemoizedConversationContent ... />;
    case 'actions':
      return <MemoizedActionsContent ... />;
    // etc...
  }
};
```

### 2. Debounce Input Updates

```tsx
// apps/omnii-mobile/src/components/chat/ChatInput.tsx

import { useMemo } from 'react';
import debounce from 'lodash/debounce';

export const ChatInput: React.FC<ChatInputProps> = ({
  messageInput,
  setMessageInput,
  // ... other props
}) => {
  // Debounce the input handler to reduce re-renders
  const debouncedSetMessageInput = useMemo(
    () => debounce(setMessageInput, 50),
    [setMessageInput]
  );

  return (
    <TextInput
      // ... other props
      onChangeText={debouncedSetMessageInput}
    />
  );
};
```

### 3. Use Local State for Input

```tsx
// apps/omnii-mobile/src/components/chat/ChatInput.tsx

export const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  // ... other props
}) => {
  // Use local state for input to prevent parent re-renders
  const [localInput, setLocalInput] = useState('');
  
  const handleSend = () => {
    if (localInput.trim()) {
      onSend(localInput);
      setLocalInput('');
    }
  };

  return (
    <TextInput
      value={localInput}
      onChangeText={setLocalInput}
      // ... other props
    />
  );
};
```

### 4. Optimize Hook Dependencies

```tsx
// apps/omnii-mobile/src/hooks/useChatState.ts

// Use useCallback with minimal dependencies
const handleSendMessage = useCallback((message: string) => {
  if (message.trim() && chat.isConnected) {
    chat.sendMessage(message);
    setPendingAction(message);
    
    if (!responsive.effectiveIsDesktop) {
      triggerCheering(CheeringTrigger.TASK_COMPLETE);
    }
  }
}, [chat.isConnected, chat.sendMessage, responsive.effectiveIsDesktop, triggerCheering]);
// Remove messageInput from dependencies
```

### 5. Lazy Load Heavy Components

```tsx
// apps/omnii-mobile/src/app/(tabs)/chat.tsx

import { lazy, Suspense } from 'react';

// Lazy load heavy components
const ActionsContent = lazy(() => import('~/components/chat/ActionsContent'));
const ReferencesContent = lazy(() => import('~/components/chat/ReferencesContent'));
const MemoryContent = lazy(() => import('~/components/chat/MemoryContent'));

// Wrap in Suspense
const renderTabContent = () => {
  switch (selectedTab) {
    case 'actions':
      return (
        <Suspense fallback={<LoadingSpinner />}>
          <ActionsContent ... />
        </Suspense>
      );
    // etc...
  }
};
```

## Quick Win: Immediate Fix

The quickest fix is to use local state in ChatInput to prevent parent re-renders:

```tsx
// apps/omnii-mobile/src/components/chat/ChatInput.tsx

export const ChatInput: React.FC<ChatInputProps> = ({
  messageInput: parentInput,
  setMessageInput: setParentInput,
  onSend,
  // ... other props
}) => {
  const [localInput, setLocalInput] = useState(parentInput);
  
  // Sync with parent only on send
  const handleSend = () => {
    if (localInput.trim()) {
      onSend(localInput);
      setLocalInput('');
      setParentInput(''); // Clear parent state too
    }
  };

  return (
    <TextInput
      value={localInput}
      onChangeText={setLocalInput}
      onSubmitEditing={handleSend}
      // ... other props
    />
  );
};
```

This prevents the entire chat screen from re-rendering on each keystroke, which should significantly improve typing performance.
