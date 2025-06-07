#!/usr/bin/env node

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Screenshot dimensions for App Store submission
const SIZES = {
  'iPhone-6.9-inch': {
    width: 1290,
    height: 2796,
    folder: 'iPhone-6.9-inch'
  },
  'iPhone-6.5-inch': {
    width: 1242,
    height: 2688,
    folder: 'iPhone-6.5-inch'
  },
  'iPad-13-inch': {
    width: 2064,
    height: 2752,
    folder: 'iPad-13-inch'
  }
};

// Source screenshots directory (user placed them in the iOS icons folder)
const SOURCE_DIR = path.join(__dirname, '../assets/images/icons/ios');
const OUTPUT_BASE_DIR = path.join(__dirname, '../assets/images/icons/ios/screenshots');

// Specific source files to process (the user's 5 screenshots)
const SOURCE_FILES = [
  'Achievements.png',
  'Analytics.png', 
  'Approvals.png',
  'Chat.png',
  'Landing.png'
];

async function resizeScreenshots() {
  try {
    console.log('🖼️  Starting screenshot resize process...\n');

    // Check if source directory exists
    if (!fs.existsSync(SOURCE_DIR)) {
      console.log(`❌ Source directory not found: ${SOURCE_DIR}`);
      return;
    }

    // Filter to only the source files that exist
    const sourceFiles = SOURCE_FILES.filter(file => {
      const filePath = path.join(SOURCE_DIR, file);
      return fs.existsSync(filePath);
    });

    if (sourceFiles.length === 0) {
      console.log('❌ No source screenshot files found!');
      console.log(`📁 Expected files in: ${SOURCE_DIR}`);
      SOURCE_FILES.forEach(file => console.log(`   - ${file}`));
      return;
    }

    console.log(`📸 Found ${sourceFiles.length} source screenshots:`);
    sourceFiles.forEach((file, index) => {
      console.log(`   ${index + 1}. ${file}`);
    });
    console.log('');

    // Process each device size
    for (const [deviceName, config] of Object.entries(SIZES)) {
      console.log(`📱 Processing ${deviceName} (${config.width}×${config.height})...`);
      
      const outputDir = path.join(OUTPUT_BASE_DIR, config.folder);
      
      // Create output directory if it doesn't exist
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Resize each source image
      for (let i = 0; i < sourceFiles.length; i++) {
        const sourceFile = sourceFiles[i];
        const sourcePath = path.join(SOURCE_DIR, sourceFile);
        
        // Create output filename using source name
        const fileExt = path.extname(sourceFile);
        const baseName = path.basename(sourceFile, fileExt).toLowerCase();
        const outputName = `${deviceName.toLowerCase()}-${baseName}${fileExt}`;
        const outputPath = path.join(outputDir, outputName);

        try {
          // Get source image info
          const metadata = await sharp(sourcePath).metadata();
          console.log(`   Processing: ${sourceFile} (${metadata.width}×${metadata.height})`);

          // Resize image to exact dimensions with smart crop
          await sharp(sourcePath)
            .resize(config.width, config.height, {
              fit: 'cover',
              position: 'center'
            })
            .png({ quality: 95, compressionLevel: 6 })
            .toFile(outputPath);

          console.log(`   ✅ Created: ${outputName}`);
        } catch (error) {
          console.log(`   ❌ Error processing ${sourceFile}:`, error.message);
        }
      }
      console.log('');
    }

    console.log('🎉 Screenshot resize complete!\n');
    
    // Show summary
    console.log('📊 Summary:');
    for (const [deviceName, config] of Object.entries(SIZES)) {
      const outputDir = path.join(OUTPUT_BASE_DIR, config.folder);
      const files = fs.existsSync(outputDir) ? 
        fs.readdirSync(outputDir).filter(f => /\.(png|jpg|jpeg)$/i.test(f)) : [];
      console.log(`   ${deviceName}: ${files.length} screenshots`);
    }
    
    console.log('\n🚀 Screenshots ready for App Store submission!');
    console.log(`📁 Location: ${OUTPUT_BASE_DIR}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
resizeScreenshots();

export { resizeScreenshots, SIZES }; 