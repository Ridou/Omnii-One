# Public Assets Directory

This directory contains shared assets that can be used across all platforms and devices for the Omnii app.

## Directory Structure

```
assets/images/public/
├── logos/                    # Main app logos
│   ├── omnii-logo.svg       # Square logo (120x120)
│   └── omnii-logo-horizontal.svg  # Horizontal logo (200x60)
├── branding/                 # Brand-specific assets
├── oauth/                    # OAuth-specific logos
│   └── google-oauth-logo.svg # Google OAuth consent screen logo (120x120)
└── README.md                # This file
```

## Logo Usage

### Main Logos (`/logos/`)

#### `omnii-logo.svg` (120x120px)
- **Use for**: App icons, profile pictures, square spaces
- **Platforms**: iOS app icon, Android app icon, web favicon
- **Colors**: Blue (#007AFF) background, white elements

#### `omnii-logo-horizontal.svg` (200x60px)
- **Use for**: Headers, navigation bars, wide layouts
- **Platforms**: Web headers, email signatures, documents
- **Colors**: Blue (#007AFF) icon and text

### OAuth Logos (`/oauth/`)

#### `google-oauth-logo.svg` (120x120px)
- **Use for**: Google Cloud Console OAuth consent screen
- **Requirements**: 120x120px minimum, clean background
- **Upload to**: Google Cloud Console → OAuth consent screen → Application logo

## How to Use in Code

### React Native Components
```typescript
import { Image } from 'react-native';

// For SVG support, you might need react-native-svg
<Image 
  source={require('@/assets/images/public/logos/omnii-logo.svg')}
  style={{ width: 120, height: 120 }}
/>
```

### Web/Expo Web
```typescript
import logoSrc from '@/assets/images/public/logos/omnii-logo.svg';

<img src={logoSrc} alt="Omnii Logo" width="120" height="120" />
```

### Static References
```typescript
// For static file serving
const logoPath = '/assets/images/public/logos/omnii-logo.svg';
```

## Google OAuth Setup

1. **Upload Logo to Google Cloud Console**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Navigate to **APIs & Services** → **OAuth consent screen**
   - Upload `assets/images/public/oauth/google-oauth-logo.svg`

2. **Update Application Information**:
   ```
   Application name: Omnii
   Application logo: google-oauth-logo.svg
   Application home page: https://omnii.app
   ```

## Brand Guidelines

### Colors
- **Primary Blue**: #007AFF (iOS system blue)
- **White**: #FFFFFF
- **Background**: #F2F2F7 (iOS system background)

### Typography
- **Primary Font**: SF Pro Display (iOS), Roboto (Android), System fonts (Web)
- **Weights**: Regular (400), Medium (500), Semibold (600), Bold (700)

### Logo Usage Rules
1. **Minimum Size**: 24x24px for the square logo
2. **Clear Space**: Maintain at least 8px clear space around the logo
3. **Background**: Use on light backgrounds for best contrast
4. **Modifications**: Don't modify colors, proportions, or elements

## File Formats

### SVG (Recommended)
- **Pros**: Scalable, small file size, crisp on all displays
- **Use for**: Web, documentation, print materials
- **Support**: Modern browsers, React Native with react-native-svg

### PNG (Alternative)
- **Pros**: Universal support, good for raster graphics
- **Use for**: Older systems, email, legacy platforms
- **Sizes**: Provide multiple sizes (24px, 48px, 120px, 240px)

## Adding New Assets

When adding new public assets:

1. **Follow naming convention**: `omnii-[type]-[variant].svg`
2. **Use consistent colors**: Stick to brand colors
3. **Optimize file size**: Remove unnecessary elements
4. **Test across platforms**: Ensure compatibility
5. **Update this README**: Document new assets

## Platform-Specific Notes

### iOS
- App icons should be PNG format in multiple sizes
- Use SF Pro Display font family
- Follow iOS Human Interface Guidelines

### Android
- Adaptive icons supported
- Use Roboto font family
- Follow Material Design guidelines

### Web
- SVG preferred for scalability
- Provide PNG fallbacks for older browsers
- Consider dark mode variants 