import fs from 'fs-extra';
import path from 'path';
import { logger } from './logger.js';

// Better organization following standard practices
const ASSET_PATHS = {
  ios: '../assets/images/icons/ios/',
  android: '../assets/images/icons/android/', 
  web: '../public/',
  reports: '../assets/images/reports/'
};

export async function setupDirectories() {
  const directories = [
    // iOS directories
    `${ASSET_PATHS.ios}/app-icons/`,
    `${ASSET_PATHS.ios}/launch-screens/`,
    `${ASSET_PATHS.ios}/screenshots/iPhone-6.7-inch/`,
    `${ASSET_PATHS.ios}/screenshots/iPhone-6.5-inch/`,
    `${ASSET_PATHS.ios}/screenshots/iPhone-5.5-inch/`,
    `${ASSET_PATHS.ios}/screenshots/iPad-12.9-inch/`,
    `${ASSET_PATHS.ios}/screenshots/iPad-11-inch/`,
    
    // Android directories
    `${ASSET_PATHS.android}/app-icons/`,
    `${ASSET_PATHS.android}/adaptive-icons/`,
    
    // Web directories (public for direct access)
    `${ASSET_PATHS.web}`,
    
    // Reports
    `${ASSET_PATHS.reports}`
  ];

  logger.info('Setting up directory structure...');
  
  for (const dir of directories) {
    await fs.ensureDir(dir);
    logger.debug(`Created directory: ${dir}`);
  }
  
  logger.success(`Created ${directories.length} directories`);
}

export async function cleanupOldAssets() {
  // Clean up the old generated folder and individual assets
  const pathsToClean = [
    '../assets/images/generated/',
    '../public/favicon.ico',
    '../public/manifest.json'
  ];
  
  for (const cleanPath of pathsToClean) {
    if (await fs.pathExists(cleanPath)) {
      logger.warning(`Cleaning up old assets: ${cleanPath}`);
      await fs.remove(cleanPath);
    }
  }
  
  logger.success('Old assets cleaned up');
}

export async function verifySourceFile(sourcePath) {
  if (!await fs.pathExists(sourcePath)) {
    throw new Error(`Source file not found: ${sourcePath}`);
  }
  
  const stats = await fs.stat(sourcePath);
  logger.info(`Source file: ${sourcePath} (${(stats.size / 1024).toFixed(1)}KB)`);
  
  return true;
}

export async function saveGenerationReport(report) {
  const reportPath = `${ASSET_PATHS.reports}/generation-report.json`;
  await fs.writeJson(reportPath, report, { spaces: 2 });
  logger.success(`Generation report saved to: ${reportPath}`);
}

export async function countGeneratedAssets() {
  const stats = {
    ios: 0,
    android: 0,
    web: 0,
    total: 0
  };

  try {
    // Count iOS assets
    if (await fs.pathExists(`${ASSET_PATHS.ios}/app-icons/`)) {
      const iosAppIcons = await fs.readdir(`${ASSET_PATHS.ios}/app-icons/`);
      stats.ios += iosAppIcons.length;
    }
    
    if (await fs.pathExists(`${ASSET_PATHS.ios}/launch-screens/`)) {
      const iosLaunchScreens = await fs.readdir(`${ASSET_PATHS.ios}/launch-screens/`);
      stats.ios += iosLaunchScreens.length;
    }

    // Count Android assets
    if (await fs.pathExists(`${ASSET_PATHS.android}/app-icons/`)) {
      const androidIcons = await fs.readdir(`${ASSET_PATHS.android}/app-icons/`);
      stats.android += androidIcons.length;
    }

    // Count Web assets (in public directory)
    const webFiles = ['favicon.ico', 'manifest.json'];
    for (const file of webFiles) {
      if (await fs.pathExists(`${ASSET_PATHS.web}/${file}`)) {
        stats.web++;
      }
    }

    stats.total = stats.ios + stats.android + stats.web;
  } catch (error) {
    logger.warning('Could not count all assets - some directories may be empty');
  }

  return stats;
}

export function getOutputPath(platform, type, filename) {
  switch (platform) {
    case 'ios':
      return `${ASSET_PATHS.ios}/${type}/${filename}`;
    case 'android':
      return `${ASSET_PATHS.android}/${type}/${filename}`;
    case 'web':
      return `${ASSET_PATHS.web}/${filename}`;
    default:
      return `${ASSET_PATHS.reports}/${filename}`;
  }
} 