import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { AppColors } from '~/constants/Colors';
import DebugPanel from './DebugPanel';

const { width, height } = Dimensions.get('window');

export default function FloatingDebugButton() {
  const [showDebugPanel, setShowDebugPanel] = useState(false);

  // Only show in development
  if (!__DEV__) return null;

  return (
    <>
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => setShowDebugPanel(true)}
      >
        <View style={styles.buttonInner}>
          <View style={styles.buttonDot} />
          <View style={styles.buttonDot} />
          <View style={styles.buttonDot} />
        </View>
      </TouchableOpacity>

      <DebugPanel 
        visible={showDebugPanel}
        onClose={() => setShowDebugPanel(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF6B47',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  buttonInner: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 3,
  },
  buttonDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'white',
  },
}); 