import sharp from 'sharp';
import { IOS_APP_ICON_SIZES, IOS_LAUNCH_SCREEN_SIZES, IOS_SCREENSHOT_SIZES } from '../config/ios-sizes.js';
import { logger } from '../utils/logger.js';
import { getOutputPath } from '../utils/file-manager.js';

export async function generateiOSAssets(sourceLogo) {
  logger.info('Starting iOS asset generation...');
  
  const stats = {
    appIcons: 0,
    launchScreens: 0,
    screenshots: 0
  };

  // Generate app icons - essential for App Store
  logger.info('Generating iOS app icons...');
  for (let i = 0; i < IOS_APP_ICON_SIZES.length; i++) {
    const icon = IOS_APP_ICON_SIZES[i];
    await generateiOSAppIcon(sourceLogo, icon);
    stats.appIcons++;
    logger.progress(i + 1, IOS_APP_ICON_SIZES.length, `${icon.name}.png`);
  }

  // Generate launch screens
  logger.info('\nGenerating iOS launch screens...');
  for (let i = 0; i < IOS_LAUNCH_SCREEN_SIZES.length; i++) {
    const screen = IOS_LAUNCH_SCREEN_SIZES[i];
    await generateLaunchScreen(sourceLogo, screen);
    stats.launchScreens++;
    logger.progress(i + 1, IOS_LAUNCH_SCREEN_SIZES.length, `${screen.name}.png`);
  }

  // Generate screenshot templates (for App Store)
  logger.info('\nGenerating iOS screenshot templates...');
  for (let i = 0; i < IOS_SCREENSHOT_SIZES.length; i++) {
    const screenshot = IOS_SCREENSHOT_SIZES[i];
    await generateScreenshotTemplate(sourceLogo, screenshot);
    stats.screenshots++;
    logger.progress(i + 1, IOS_SCREENSHOT_SIZES.length, `${screenshot.name}.png`);
  }

  logger.success(`\nGenerated ${stats.appIcons} app icons, ${stats.launchScreens} launch screens, and ${stats.screenshots} screenshot templates`);
  return stats;
}

async function generateiOSAppIcon(sourceLogo, iconConfig) {
  const outputPath = getOutputPath('ios', 'app-icons', `${iconConfig.name}.png`);
  
  try {
    await sharp(sourceLogo)
      .resize(iconConfig.width, iconConfig.height, {
        kernel: sharp.kernel.lanczos3,
        fit: 'cover',
        position: 'center'
      })
      .png({ quality: 100, compressionLevel: 9 })
      .toFile(outputPath);
    
    logger.debug(`Generated ${iconConfig.name}.png (${iconConfig.width}x${iconConfig.height})`);
  } catch (error) {
    logger.error(`Failed to generate iOS app icon ${iconConfig.name}: ${error.message}`);
    throw error;
  }
}

async function generateLaunchScreen(sourceLogo, screenConfig) {
  const outputPath = getOutputPath('ios', 'launch-screens', `${screenConfig.name}.png`);
  
  try {
    // Calculate logo size (20% of screen width for good proportion)
    const logoSize = Math.round(screenConfig.width * 0.2);
    
    // Create logo buffer
    const logoBuffer = await sharp(sourceLogo)
      .resize(logoSize, logoSize, {
        kernel: sharp.kernel.lanczos3,
        fit: 'cover'
      })
      .png()
      .toBuffer();
    
    // Create launch screen with white background and centered logo
    await sharp({
      create: {
        width: screenConfig.width,
        height: screenConfig.height,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 } // White background
      }
    })
    .composite([{
      input: logoBuffer,
      top: Math.round((screenConfig.height - logoSize) / 2),
      left: Math.round((screenConfig.width - logoSize) / 2)
    }])
    .png({ quality: 95 })
    .toFile(outputPath);
    
    logger.debug(`Generated ${screenConfig.name}.png (${screenConfig.width}x${screenConfig.height})`);
  } catch (error) {
    logger.error(`Failed to generate launch screen ${screenConfig.name}: ${error.message}`);
    throw error;
  }
}

async function generateScreenshotTemplate(sourceLogo, screenshotConfig) {
  const deviceFolder = screenshotConfig.name.includes('iPhone') ? 
    screenshotConfig.name.replace('screenshot-', '').replace('.png', '') : 
    screenshotConfig.name.replace('screenshot-', '').replace('.png', '');
  
  const outputPath = getOutputPath('ios', `screenshots/${deviceFolder}`, `${screenshotConfig.name}.png`);
  
  try {
    // Calculate logo size (15% of screen width for screenshot templates)
    const logoSize = Math.round(screenshotConfig.width * 0.15);
    
    // Create logo buffer
    const logoBuffer = await sharp(sourceLogo)
      .resize(logoSize, logoSize, {
        kernel: sharp.kernel.lanczos3,
        fit: 'cover'
      })
      .png()
      .toBuffer();
    
    // Create screenshot template with OMNII blue background
    await sharp({
      create: {
        width: screenshotConfig.width,
        height: screenshotConfig.height,
        channels: 4,
        background: { r: 0, g: 122, b: 255, alpha: 1 } // OMNII blue
      }
    })
    .composite([{
      input: logoBuffer,
      top: Math.round((screenshotConfig.height - logoSize) / 2),
      left: Math.round((screenshotConfig.width - logoSize) / 2)
    }])
    .png({ quality: 95 })
    .toFile(outputPath);
    
    logger.debug(`Generated ${screenshotConfig.name}.png (${screenshotConfig.width}x${screenshotConfig.height})`);
  } catch (error) {
    logger.error(`Failed to generate screenshot template ${screenshotConfig.name}: ${error.message}`);
    throw error;
  }
} 