// Learn more: https://docs.expo.dev/guides/monorepos/
const { getDefaultConfig } = require("expo/metro-config");
const { FileStore } = require("metro-cache");
const { withNativeWind } = require("nativewind/metro");

const path = require("node:path");

const baseConfig = getDefaultConfig(__dirname);

// PowerSync requires package exports support for ESM resolution
baseConfig.resolver.unstable_enablePackageExports = true;

const config = withTurborepoManagedCache(
  withNativeWind(baseConfig, {
    input: "./src/styles/global.css",
    configPath: "./tailwind.config.ts",
  }),
);
module.exports = config;

/**
 * Move the Metro cache to the `.cache/metro` folder.
 * If you have any environment variables, you can configure Turborepo to invalidate it when needed.
 *
 * @see https://turborepo.com/docs/reference/configuration#env
 * @param {import('expo/metro-config').MetroConfig} config
 * @returns {import('expo/metro-config').MetroConfig}
 */
function withTurborepoManagedCache(config) {
  config.cacheStores = [
    new FileStore({ root: path.join(__dirname, ".cache/metro") }),
  ];
  return config;
}
