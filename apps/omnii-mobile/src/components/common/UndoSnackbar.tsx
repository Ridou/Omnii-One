import { useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { AppColors } from '~/constants/Colors';

interface UndoSnackbarProps {
  visible: boolean;
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
  autoHideDelay?: number;
}

export function UndoSnackbar({ 
  visible, 
  message, 
  onUndo, 
  onDismiss, 
  autoHideDelay = 5000 
}: UndoSnackbarProps) {
  const translateY = useRef(new Animated.Value(100)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const hideSnackbar = useCallback(() => {
    Animated.timing(translateY, {
      toValue: 100,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onDismiss();
    });
  }, [translateY, onDismiss]);

  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }).start();

      const timer = setTimeout(() => {
        hideSnackbar();
      }, autoHideDelay);

      return () => clearTimeout(timer);
    }
  }, [visible, autoHideDelay, hideSnackbar, translateY]);

  const handleUndoPress = () => {
    // Add press animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    onUndo();
    hideSnackbar();
  };

  if (!visible) return null;

  return (
    <Animated.View 
      style={[
        styles.container,
        { transform: [{ translateY }] }
      ]}
    >
      {/* Background gradient */}
      <View style={styles.backgroundGradient}>
        <Svg height="100%" width="100%" style={StyleSheet.absoluteFillObject}>
          <Defs>
            <LinearGradient id="snackbarGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#2d3436" stopOpacity="0.95" />
              <Stop offset="50%" stopColor="#636e72" stopOpacity="0.9" />
              <Stop offset="100%" stopColor="#2d3436" stopOpacity="0.95" />
            </LinearGradient>
            <LinearGradient id="shimmerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="rgba(255,255,255,0)" />
              <Stop offset="50%" stopColor="rgba(255,255,255,0.1)" />
              <Stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#snackbarGradient)" />
          <Rect width="100%" height="100%" fill="url(#shimmerGradient)" />
        </Svg>
      </View>

      <Text style={styles.message}>{message}</Text>
      
      <Animated.View style={[{ transform: [{ scale: scaleAnim }] }]}>
        <TouchableOpacity style={styles.undoButton} onPress={handleUndoPress}>
          <View style={styles.undoButtonGradient}>
            <Svg height="100%" width="100%" style={StyleSheet.absoluteFillObject}>
              <Defs>
                <LinearGradient id="undoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor={AppColors.aiGradientStart} />
                  <Stop offset="100%" stopColor={AppColors.aiGradientEnd} />
                </LinearGradient>
              </Defs>
              <Rect width="100%" height="100%" fill="url(#undoGradient)" />
            </Svg>
          </View>
          <Text style={styles.undoText}>UNDO</Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 90, // Above tab bar
    left: 20,
    right: 20,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...AppColors.shadows.elevated,
    zIndex: 1000,
    overflow: 'hidden',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
  },
  message: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    zIndex: 1,
  },
  undoButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    position: 'relative',
    overflow: 'hidden',
    zIndex: 1,
  },
  undoButtonGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 8,
  },
  undoText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    zIndex: 1,
  },
}); 