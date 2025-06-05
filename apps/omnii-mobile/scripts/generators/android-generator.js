import sharp from 'sharp';
import { ANDROID_ICON_SIZES, ANDROID_ADAPTIVE_ICONS } from '../config/android-sizes.js';
import { logger } from '../utils/logger.js';
import { getOutputPath } from '../utils/file-manager.js';

export async function generateAndroidAssets(sourceLogo) {
  logger.info('Starting Android asset generation...');
  
  const stats = {
    standardIcons: 0,
    adaptiveIcons: 0
  };

  // Generate standard Android icons
  logger.info('Generating Android standard icons...');
  for (let i = 0; i < ANDROID_ICON_SIZES.length; i++) {
    const icon = ANDROID_ICON_SIZES[i];
    await generateAndroidIcon(sourceLogo, icon);
    stats.standardIcons++;
    logger.progress(i + 1, ANDROID_ICON_SIZES.length, `${icon.name}.png`);
  }

  // Generate adaptive icons (Android 8.0+)
  logger.info('\nGenerating Android adaptive icons...');
  for (let i = 0; i < ANDROID_ADAPTIVE_ICONS.length; i++) {
    const icon = ANDROID_ADAPTIVE_ICONS[i];
    await generateAdaptiveIcon(sourceLogo, icon);
    stats.adaptiveIcons++;
    logger.progress(i + 1, ANDROID_ADAPTIVE_ICONS.length, `${icon.name}.png`);
  }

  logger.success(`\nGenerated ${stats.standardIcons} standard icons and ${stats.adaptiveIcons} adaptive icons`);
  return stats;
}

async function generateAndroidIcon(sourceLogo, iconConfig) {
  const outputPath = getOutputPath('android', 'app-icons', `${iconConfig.name}.png`);
  
  try {
    await sharp(sourceLogo)
      .resize(iconConfig.size, iconConfig.size, {
        kernel: sharp.kernel.lanczos3,
        fit: 'cover',
        position: 'center'
      })
      .png({ quality: 100, compressionLevel: 9 })
      .toFile(outputPath);
    
    logger.debug(`Generated ${iconConfig.name}.png (${iconConfig.size}x${iconConfig.size})`);
  } catch (error) {
    logger.error(`Failed to generate Android icon ${iconConfig.name}: ${error.message}`);
    throw error;
  }
}

async function generateAdaptiveIcon(sourceLogo, iconConfig) {
  const outputPath = getOutputPath('android', 'adaptive-icons', `${iconConfig.name}.png`);
  
  try {
    if (iconConfig.type === 'foreground') {
      // Adaptive foreground - logo with transparent background and safe area
      const safeZoneSize = Math.round(iconConfig.size * 0.66); // 66% for safe zone
      const padding = Math.round((iconConfig.size - safeZoneSize) / 2);
      
      // Create transparent background
      const background = await sharp({
        create: {
          width: iconConfig.size,
          height: iconConfig.size,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent
        }
      }).png().toBuffer();
      
      // Resize logo for safe zone
      const resizedLogo = await sharp(sourceLogo)
        .resize(safeZoneSize, safeZoneSize, {
          kernel: sharp.kernel.lanczos3,
          fit: 'cover'
        })
        .png()
        .toBuffer();
      
      // Composite logo on transparent background
      await sharp(background)
        .composite([{
          input: resizedLogo,
          top: padding,
          left: padding
        }])
        .png({ quality: 100, compressionLevel: 9 })
        .toFile(outputPath);
        
    } else if (iconConfig.type === 'background') {
      // Adaptive background - solid color
      await sharp({
        create: {
          width: iconConfig.size,
          height: iconConfig.size,
          channels: 4,
          background: { r: 0, g: 122, b: 255, alpha: 1 } // OMNII blue
        }
      })
      .png({ quality: 100 })
      .toFile(outputPath);
    }
    
    logger.debug(`Generated ${iconConfig.name}.png (${iconConfig.size}x${iconConfig.size}, ${iconConfig.type})`);
  } catch (error) {
    logger.error(`Failed to generate adaptive icon ${iconConfig.name}: ${error.message}`);
    throw error;
  }
} 