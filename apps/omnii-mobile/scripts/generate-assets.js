#!/usr/bin/env node

import { generateiOSAssets } from './generators/ios-generator.js';
import { generateAndroidAssets } from './generators/android-generator.js';
import { generateWebAssets } from './generators/web-generator.js';
import { 
  setupDirectories, 
  cleanupOldAssets, 
  verifySourceFile, 
  countGeneratedAssets,
  saveGenerationReport 
} from './utils/file-manager.js';
import { logger } from './utils/logger.js';
import colors from 'colors';

const SOURCE_LOGO = '../src/assets/images/public/logos/omniiLogoPNG.png';

async function main() {
  console.log(colors.blue.bold('\n🚀 OMNII Asset Generation System\n'));
  
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const shouldClean = args.includes('--clean');
    const onlyPlatform = args.find(arg => ['--ios', '--android', '--web'].includes(arg))?.replace('--', '');
    
    // Verify source logo exists
    logger.info('Verifying source logo...');
    await verifySourceFile(SOURCE_LOGO);
    
    // Setup directory structure
    await setupDirectories();
    
    // Clean up old assets if requested
    if (shouldClean) {
      await cleanupOldAssets();
      await setupDirectories(); // Recreate after cleanup
    }
    
    // Track generation statistics
    const stats = {
      ios: { appIcons: 0, launchScreens: 0, screenshots: 0 },
      android: { standardIcons: 0, adaptiveIcons: 0 },
      web: { favicons: 0, socialMedia: 0, special: 0 },
      startTime: Date.now(),
      endTime: null,
      totalAssets: 0
    };
    
    // Generate assets based on platform selection
    if (!onlyPlatform || onlyPlatform === 'ios') {
      logger.info('\n📱 Starting iOS asset generation...');
      const iosStats = await generateiOSAssets(SOURCE_LOGO);
      stats.ios = iosStats;
    }
    
    if (!onlyPlatform || onlyPlatform === 'android') {
      logger.info('\n🤖 Starting Android asset generation...');
      const androidStats = await generateAndroidAssets(SOURCE_LOGO);
      stats.android = androidStats;
    }
    
    if (!onlyPlatform || onlyPlatform === 'web') {
      logger.info('\n🌐 Starting web asset generation...');
      const webStats = await generateWebAssets(SOURCE_LOGO);
      stats.web = webStats;
    }
    
    // Finalize statistics
    stats.endTime = Date.now();
    stats.totalAssets = await countTotalAssets(stats);
    
    // Generate and save report
    await generateReport(stats);
    
    // Display summary
    displayFinalSummary(stats);
    
  } catch (error) {
    logger.error(`Asset generation failed: ${error.message}`);
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

function countTotalAssets(stats) {
  return (
    (stats.ios.appIcons || 0) + 
    (stats.ios.launchScreens || 0) + 
    (stats.ios.screenshots || 0) +
    (stats.android.standardIcons || 0) + 
    (stats.android.adaptiveIcons || 0) +
    (stats.web.favicons || 0) + 
    (stats.web.socialMedia || 0) + 
    (stats.web.special || 0)
  );
}

async function generateReport(stats) {
  const report = {
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    source: SOURCE_LOGO,
    duration: `${((stats.endTime - stats.startTime) / 1000).toFixed(2)}s`,
    totalAssets: stats.totalAssets,
    platforms: {
      ios: {
        enabled: stats.ios.appIcons > 0 || stats.ios.launchScreens > 0 || stats.ios.screenshots > 0,
        appIcons: stats.ios.appIcons || 0,
        launchScreens: stats.ios.launchScreens || 0,
        screenshots: stats.ios.screenshots || 0,
        total: (stats.ios.appIcons || 0) + (stats.ios.launchScreens || 0) + (stats.ios.screenshots || 0)
      },
      android: {
        enabled: stats.android.standardIcons > 0 || stats.android.adaptiveIcons > 0,
        standardIcons: stats.android.standardIcons || 0,
        adaptiveIcons: stats.android.adaptiveIcons || 0,
        total: (stats.android.standardIcons || 0) + (stats.android.adaptiveIcons || 0)
      },
      web: {
        enabled: stats.web.favicons > 0 || stats.web.socialMedia > 0 || stats.web.special > 0,
        favicons: stats.web.favicons || 0,
        socialMedia: stats.web.socialMedia || 0,
        special: stats.web.special || 0,
        total: (stats.web.favicons || 0) + (stats.web.socialMedia || 0) + (stats.web.special || 0)
      }
    },
    recommendations: generateRecommendations(stats)
  };
  
  await saveGenerationReport(report);
  return report;
}

function generateRecommendations(stats) {
  const recommendations = [];
  
  if (stats.ios.appIcons > 0) {
    recommendations.push('📱 Update app.config.js to use the generated iOS icons');
    recommendations.push('🍎 Upload app icons to App Store Connect');
  }
  
  if (stats.web.favicons > 0) {
    recommendations.push('🌐 Update HTML head tags to reference the new favicons');
    recommendations.push('📄 Add the generated manifest.json to your web app');
  }
  
  if (stats.android.adaptiveIcons > 0) {
    recommendations.push('🤖 Configure adaptive icons in your Android build');
  }
  
  if (stats.ios.screenshots > 0) {
    recommendations.push('📸 Replace screenshot templates with actual app screenshots');
  }
  
  recommendations.push('✅ Test all generated assets on target devices');
  recommendations.push('🔍 Validate assets using platform-specific tools');
  
  return recommendations;
}

function displayFinalSummary(stats) {
  console.log(colors.green.bold('\n🎉 Asset Generation Complete!\n'));
  
  // Platform summaries
  if (stats.ios.appIcons > 0 || stats.ios.launchScreens > 0 || stats.ios.screenshots > 0) {
    console.log(colors.blue('📱 iOS Assets:'));
    console.log(`   App Icons: ${colors.white.bold(stats.ios.appIcons || 0)}`);
    console.log(`   Launch Screens: ${colors.white.bold(stats.ios.launchScreens || 0)}`);
    console.log(`   Screenshot Templates: ${colors.white.bold(stats.ios.screenshots || 0)}`);
  }
  
  if (stats.android.standardIcons > 0 || stats.android.adaptiveIcons > 0) {
    console.log(colors.green('🤖 Android Assets:'));
    console.log(`   Standard Icons: ${colors.white.bold(stats.android.standardIcons || 0)}`);
    console.log(`   Adaptive Icons: ${colors.white.bold(stats.android.adaptiveIcons || 0)}`);
  }
  
  if (stats.web.favicons > 0 || stats.web.socialMedia > 0 || stats.web.special > 0) {
    console.log(colors.cyan('🌐 Web Assets:'));
    console.log(`   Favicons: ${colors.white.bold(stats.web.favicons || 0)}`);
    console.log(`   Social Media: ${colors.white.bold(stats.web.socialMedia || 0)}`);
    console.log(`   Special Files: ${colors.white.bold(stats.web.special || 0)}`);
  }
  
  console.log(colors.yellow(`\n📊 Total Assets: ${colors.white.bold(stats.totalAssets)}`));
  console.log(colors.yellow(`⏱️  Duration: ${colors.white.bold(((stats.endTime - stats.startTime) / 1000).toFixed(2))}s`));
  
  console.log(colors.gray('\n📁 Assets organized in standard directories:'));
  console.log(colors.gray('   iOS: assets/images/icons/ios/'));
  console.log(colors.gray('   Android: assets/images/icons/android/'));
  console.log(colors.gray('   Web: public/ (directly accessible)'));
  console.log(colors.gray('📋 Generation report: assets/images/reports/generation-report.json'));
  
  console.log(colors.magenta.bold('\n🚀 Ready for App Store submission and web deployment!\n'));
}

// Show usage information
function showUsage() {
  console.log(colors.blue.bold('OMNII Asset Generator\n'));
  console.log('Usage: node scripts/generate-assets.js [options]\n');
  console.log('Options:');
  console.log('  --clean     Clean up old generated assets first');
  console.log('  --ios       Generate only iOS assets');
  console.log('  --android   Generate only Android assets');
  console.log('  --web       Generate only web assets');
  console.log('  --help      Show this help message\n');
  console.log('Examples:');
  console.log('  node scripts/generate-assets.js');
  console.log('  node scripts/generate-assets.js --clean');
  console.log('  node scripts/generate-assets.js --ios --clean');
  console.log('  npm run generate:assets\n');
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  showUsage();
  process.exit(0);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    logger.error(`Fatal error: ${error.message}`);
    process.exit(1);
  });
}

export { main as generateAllAssets }; 