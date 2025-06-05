const { getDefaultConfig } = require('expo/metro-config');
const { FileStore } = require('metro-cache');
const { withNativeWind } = require('nativewind/metro');
const path = require('node:path');

const config = withTurborepoManagedCache(
  withNativeWind(getDefaultConfig(__dirname), {
    input: './global.css',
    configPath: './tailwind.config.js',
  })
);

// With this (no NativeWind):  
// const config = withTurborepoManagedCache(  
//   getDefaultConfig(__dirname)  
// );

// Simplified configuration for development builds
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Essential polyfills
config.resolver.alias = {
  ...config.resolver.alias,
  buffer: require.resolve('buffer'),
  stream: require.resolve('stream-browserify'),
  events: require.resolve('events'),
  util: require.resolve('util'),
  process: require.resolve('process'),
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
