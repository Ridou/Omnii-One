import sharp from 'sharp';
import fs from 'fs-extra';
import { logger } from '../utils/logger.js';
import { getOutputPath } from '../utils/file-manager.js';

// Essential favicon sizes following modern web standards
const ESSENTIAL_FAVICONS = [
  // Core favicons (directly in public)
  { name: 'favicon.ico', size: 32, format: 'png' },
  { name: 'favicon.svg', size: null, format: 'svg' },
  
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
    if (favicon.format === 'svg') {
      await generateSVGFavicon(sourceLogo);
    } else {
      await generateFavicon(sourceLogo, favicon);
    }
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
    await sharp(sourceLogo)
      .resize(faviconConfig.size, faviconConfig.size, {
        kernel: sharp.kernel.lanczos3,
        fit: 'cover',
        position: 'center'
      })
      .png({ quality: 100, compressionLevel: 9 })
      .toFile(outputPath);
    
    logger.debug(`Generated ${faviconConfig.name} (${faviconConfig.size}x${faviconConfig.size})`);
  } catch (error) {
    logger.error(`Failed to generate ${faviconConfig.name}: ${error.message}`);
    throw error;
  }
}

async function generateSVGFavicon(sourceLogo) {
  const outputPath = getOutputPath('web', '', 'favicon.svg');
  
  try {
    // Create a simplified SVG favicon based on the actual logo
    // For now, we'll create a clean, scalable version using the OMNII branding
    const svgContent = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <style>
      .cls-1 { fill: #007AFF; }
      .cls-2 { fill: #FFFFFF; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 36px; font-weight: 700; }
    </style>
  </defs>
  <rect class="cls-1" width="100" height="100" rx="20"/>
  <text class="cls-2" x="50" y="62" text-anchor="middle">O</text>
</svg>`.trim();
    
    await fs.writeFile(outputPath, svgContent);
    logger.debug('Generated favicon.svg');
  } catch (error) {
    logger.error(`Failed to generate SVG favicon: ${error.message}`);
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