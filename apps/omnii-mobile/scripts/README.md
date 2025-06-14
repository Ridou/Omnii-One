# OMNII Asset Generation System

Automated asset generation for iOS App Store, Android Play Store, and web deployment.

## 🚀 Quick Start

```bash
# Generate all assets
npm run generate:assets

# Generate with cleanup
npm run generate:assets:clean

# Platform-specific generation
npm run generate:ios
npm run generate:android
npm run generate:web
```

## 📦 What Gets Generated

### iOS Assets (51 total)
- **15 App Icons**: All required sizes for iOS (20px to 1024px)
- **11 Launch Screens**: All iPhone and iPad screen sizes
- **25 Screenshot Templates**: 5 templates each for required device sizes

### Android Assets (9 total)
- **7 Standard Icons**: All density levels (ldpi to xxxhdpi)
- **2 Adaptive Icons**: Foreground and background components

### Web Assets (16 total)
- **10 Favicons**: Modern favicon set including SVG
- **3 Social Media Images**: Open Graph, Twitter, LinkedIn
- **3 Special Files**: ICO, SVG favicon, Web manifest

## 📁 Generated Structure

```
assets/images/generated/
├── ios/
│   ├── app-icons/              # All iOS app icon sizes
│   ├── launch-screens/         # iOS launch images
│   └── screenshots/            # App Store screenshot templates
├── android/
│   ├── app-icons/              # Standard Android icons
│   └── adaptive-icons/         # Adaptive icon components
├── web/
│   ├── favicons/               # Web favicon set
│   ├── pwa-icons/              # PWA manifest icons
│   ├── social-media/           # Social sharing images
│   └── manifest.json           # Web app manifest
└── reports/
    └── generation-report.json  # Detailed generation report
```

## ⚙️ Configuration

### Source Logo
- **Location**: `assets/images/public/logos/sizes/logo-app-icon-1024.png`
- **Requirements**: 1024x1024px, high quality PNG
- **Note**: Square format works best for all platforms

### Brand Colors
- **Primary**: #007AFF (OMNII Blue)
- **Background**: #FFFFFF (White)

## 🛠 Commands

| Command | Description |
|---------|-------------|
| `npm run generate:assets` | Generate all platform assets |
| `npm run generate:assets:clean` | Clean old assets and generate new ones |
| `npm run generate:ios` | Generate only iOS assets |
| `npm run generate:android` | Generate only Android assets |
| `npm run generate:web` | Generate only web assets |
| `npm run generate:help` | Show help and usage information |

## 📊 After Generation

### iOS App Store Submission
1. Upload app icons from `ios/app-icons/` to App Store Connect
2. Use launch screens for iOS app configuration
3. Replace screenshot templates with actual app screenshots
4. Test on physical iOS devices

### Android Play Store
1. Configure adaptive icons in Android Studio
2. Upload app icons to Play Console
3. Test adaptive icon behavior

### Web Deployment
1. Update HTML `<head>` with favicon links:
   ```html
   <link rel="icon" type="image/x-icon" href="/favicon.ico">
   <link rel="icon" type="image/png" sizes="32x32" href="/assets/images/generated/web/favicons/favicon-32x32.png">
   <link rel="apple-touch-icon" href="/assets/images/generated/web/favicons/apple-touch-icon.png">
   <link rel="manifest" href="/assets/images/generated/web/manifest.json">
   ```

2. Add manifest.json to your web root
3. Test PWA functionality

## 🔍 Quality Assurance

### Validation Checklist
- [ ] All required icon sizes generated
- [ ] Icons display correctly on target devices
- [ ] No pixelation or artifacts
- [ ] Correct aspect ratios maintained
- [ ] Brand colors preserved
- [ ] Files under platform size limits

### Testing Tools
- **iOS**: Xcode Simulator, TestFlight
- **Android**: Android Studio, Play Console
- **Web**: Browser dev tools, PWA testing tools

## 🐛 Troubleshooting

### Common Issues

**Source file not found**
- Verify `logo-app-icon-1024.png` exists in the correct location
- Check file permissions

**Generation fails**
- Ensure Node.js dependencies are installed: `npm install`
- Check available disk space
- Verify Sharp library installation

**Icons appear distorted**
- Source logo should be square (1:1 aspect ratio)
- Use high-resolution source (1024x1024 minimum)
- Avoid transparency in source for best results

## 📈 Performance

- **Generation Speed**: ~5-6 seconds for all 76 assets
- **Source Processing**: Uses Sharp.js for high-quality image processing
- **Optimization**: Automatic compression and quality optimization
- **Memory Efficient**: Streams processing for large files

## 🔧 Customization

### Modifying Sizes
Edit configuration files in `scripts/config/`:
- `ios-sizes.js` - iOS icon and screen sizes
- `web-sizes.js` - Web favicon and social media sizes

### Brand Colors
Update color values in generator files:
- OMNII Blue: `{ r: 0, g: 122, b: 255 }` (#007AFF)
- Background: `{ r: 255, g: 255, b: 255 }` (#FFFFFF)

### Adding New Platforms
1. Create new size configuration in `scripts/config/`
2. Add generator in `scripts/generators/`
3. Update main script to include new platform

---

**Generated by OMNII Asset Generation System v1.0.0**  
For support, see generation report or contact the development team. 