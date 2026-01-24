import { GestureHandlerRootView } from 'react-native-gesture-handler';

interface GestureProviderProps {
  children: React.ReactNode;
}

export function GestureProvider({ children }: GestureProviderProps) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {children}
    </GestureHandlerRootView>
  );
} 