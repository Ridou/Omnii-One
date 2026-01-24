export const Animations = {
  // Timing configurations
  pulse: {
    duration: 2000,
    useNativeDriver: true,
  },
  shimmer: {
    duration: 3000,
    useNativeDriver: true,
  },
  cardPress: {
    duration: 100,
    useNativeDriver: true,
  },
  modalEntrance: {
    duration: 300,
    useNativeDriver: true,
  },
  logoGlow: {
    duration: 1500,
    useNativeDriver: true,
  },
  logoRotation: {
    duration: 8000,
    useNativeDriver: true,
  },
  
  // Spring configurations
  modalSpring: {
    tension: 100,
    friction: 8,
    useNativeDriver: true,
  },
  
  // Interpolation values
  scaleValues: {
    pressed: 0.98,
    normal: 1,
    enlarged: 1.02,
  },
  
  // Opacity values
  opacityValues: {
    hidden: 0,
    dimmed: 0.3,
    visible: 1,
  },
}; 