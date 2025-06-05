const { getDefaultConfig } = require('expo/metro-config');
const { FileStore } = require('metro-cache');
const { withNativeWind } = require('nativewind/metro');
const path = require('node:path');

// Initialize config with NativeWind and Turborepo cache
const config = withTurborepoManagedCache(
  withNativeWind(getDefaultConfig(__dirname), {
    input: './global.css',
    configPath: './tailwind.config.js',
  })
);

// Configure resolver platforms
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Essential polyfills
config.resolver.alias = {
  ...config.resolver.alias,
  buffer: require.resolve('buffer'),
  stream: require.resolve('stream-browserify'),
  events: require.resolve('events'),
  util: require.resolve('util'),
  process: require.resolve('process'),
  crypto: require.resolve('expo-crypto'),
  'react-native-reanimated': require.resolve('react-native-reanimated'),
  'react-native-gesture-handler': require.resolve('react-native-gesture-handler'),
  'react-native-safe-area-context': require.resolve('react-native-safe-area-context'),
  'react-native-screens': require.resolve('react-native-screens'),
  'react-native-svg': require.resolve('react-native-svg'),
  'react-native-web': require.resolve('react-native-web'),
};

// Enable support for react-native-reanimated v3
config.transformer = {
  ...config.transformer,
  unstable_allowRequireContext: true,
};

module.exports = config;

function withTurborepoManagedCache(config) {
  config.cacheStores = [
    new FileStore({ root: path.join(__dirname, '.cache/metro') }),
  ];
  return config;
}
