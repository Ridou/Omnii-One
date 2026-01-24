import sharp from 'sharp';
import fs from 'fs-extra';
import { logger } from '../utils/logger.js';
import { getOutputPath } from '../utils/file-manager.js';

// Essential favicon sizes following modern web standards
const ESSENTIAL_FAVICONS = [
  // Core favicons (directly in public)
  { name: 'favicon.ico', size: null, format: 'ico' },
  
  // Mobile/PWA (also in public for easy access)
  { name: 'apple-touch-icon.png', size: 180, format: 'png' },
  { name: 'icon-192.png', size: 192, format: 'png' },
  { name: 'icon-512.png', size: 512, format: 'png' },
];

export async function generateWebAssets(sourceLogo) {
  logger.info('Starting web asset generation...');
  
  const stats = {
    favicons: 0,
    special: 0
  };

  // Generate essential favicons
  logger.info('Generating essential web favicons...');
  for (let i = 0; i < ESSENTIAL_FAVICONS.length; i++) {
    const favicon = ESSENTIAL_FAVICONS[i];
    await generateFavicon(sourceLogo, favicon);
    stats.favicons++;
    logger.progress(i + 1, ESSENTIAL_FAVICONS.length, favicon.name);
  }

  // Generate web manifest
  logger.info('\nGenerating web manifest...');
  await generateWebManifest();
  stats.special++;
  logger.progress(1, 1, 'manifest.json');

  logger.success(`\nGenerated ${stats.favicons} favicons and ${stats.special} special files`);
  return stats;
}

async function generateFavicon(sourceLogo, faviconConfig) {
  const outputPath = getOutputPath('web', '', faviconConfig.name);
  
  try {
    if (faviconConfig.format === 'ico') {
      // Generate ICO file with multiple sizes (16x16, 32x32, 48x48)
      await sharp(sourceLogo)
        .resize(32, 32, {
          kernel: sharp.kernel.lanczos3,
          fit: 'cover',
          position: 'center'
        })
        .png({ quality: 100, compressionLevel: 9 })
        .toFile(outputPath.replace('.ico', '.png'));
      
      // For now, just create a PNG and rename to ICO for compatibility
      // Sharp doesn't natively support ICO output, but browsers accept PNG as ICO
      await fs.rename(outputPath.replace('.ico', '.png'), outputPath);
      
      logger.debug(`Generated ${faviconConfig.name} (32x32 ICO format)`);
    } else {
      await sharp(sourceLogo)
        .resize(faviconConfig.size, faviconConfig.size, {
          kernel: sharp.kernel.lanczos3,
          fit: 'cover',
          position: 'center'
        })
        .png({ quality: 100, compressionLevel: 9 })
        .toFile(outputPath);
      
      logger.debug(`Generated ${faviconConfig.name} (${faviconConfig.size}x${faviconConfig.size})`);
    }
  } catch (error) {
    logger.error(`Failed to generate ${faviconConfig.name}: ${error.message}`);
    throw error;
  }
}

async function generateWebManifest() {
  const outputPath = getOutputPath('web', '', 'manifest.json');
  
  try {
    const manifest = {
      name: "OMNII - AI Productivity Assistant",
      short_name: "OMNII",
      description: "Your AI-powered productivity partner that evolves with you",
      start_url: "/",
      display: "standalone",
      background_color: "#ffffff",
      theme_color: "#007AFF",
      orientation: "portrait",
      scope: "/",
      icons: [
        {
          src: "/icon-192.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "any maskable"
        },
        {
          src: "/icon-512.png", 
          sizes: "512x512",
          type: "image/png",
          purpose: "any maskable"
        }
      ],
      categories: ["productivity", "business", "utilities"],
      lang: "en",
      dir: "ltr"
    };
    
    await fs.writeJson(outputPath, manifest, { spaces: 2 });
    logger.debug('Generated manifest.json');
  } catch (error) {
    logger.error(`Failed to generate web manifest: ${error.message}`);
    throw error;
  }
} 