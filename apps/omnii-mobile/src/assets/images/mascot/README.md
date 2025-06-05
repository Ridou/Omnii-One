# 🌱 OMNII Mascot Assets Organization

## Directory Structure

```
assets/
├── images/
│   └── mascot/
│       ├── stages/
│       │   ├── seed/          # Level 1-10 mascot images
│       │   ├── flower/        # Level 11-25 mascot images  
│       │   └── tree/          # Level 26+ mascot images
│       ├── animations/
│       │   ├── evolution/     # Stage transition animations (GIF/PNG sequences)
│       │   ├── celebration/   # Achievement unlock animations
│       │   ├── idle/          # Gentle breathing/movement loops
│       │   └── interaction/   # Tap response animations
│       ├── expressions/
│       │   ├── happy/         # Achievement completion expressions
│       │   ├── surprised/     # Level up surprise expressions
│       │   ├── focused/       # During work sessions
│       │   ├── proud/         # Milestone achievements
│       │   └── encouraging/   # Motivation expressions
│       ├── accessories/
│       │   ├── level-badges/  # Level indicator overlays
│       │   ├── xp-indicators/ # XP progress visual elements
│       │   └── stage-decorations/ # Stage-specific decorative elements
│       └── badges/            # Achievement badges and icons
├── sounds/
│   ├── achievements/          # Achievement unlock sounds
│   ├── celebrations/          # Level up and celebration sounds
│   └── notifications/         # Gentle notification chimes
└── videos/
    └── mascot/
        ├── evolution-sequences/   # MP4 evolution transformations
        └── celebration-animations/ # Full celebration sequences
```

## Asset Specifications

### 📱 Image Requirements

#### Stage Images (`stages/`)
- **Format**: PNG with transparency
- **Sizes**: 
  - Small: 64x64px (tab icons)
  - Medium: 128x128px (cards)
  - Large: 256x256px (main display)
  - XLarge: 512x512px (celebration modal)
- **Color**: Support for customizable primary/secondary colors
- **Style**: Consistent with app's design system

#### Animations (`animations/`)
- **Format**: PNG sequence or GIF
- **Frame Rate**: 30fps for smooth animations
- **Duration**: 
  - Evolution: 2-3 seconds
  - Celebration: 1-2 seconds
  - Idle: 3-5 second loops
  - Interaction: 0.5-1 second
- **Optimization**: Use tinypng or similar for size optimization

#### Expressions (`expressions/`)
- **Format**: PNG with transparency
- **Sizes**: Match stage image sizes
- **Variations**: 3-5 expressions per emotion
- **Timing**: Contextual to user actions

### 🎵 Audio Requirements

#### Achievement Sounds (`sounds/achievements/`)
- **Format**: MP3, 44.1kHz, 128kbps
- **Duration**: 1-3 seconds
- **Volume**: Normalized to -12dB peak
- **Style**: Positive, encouraging, game-like

#### Celebration Sounds (`sounds/celebrations/`)
- **Format**: MP3, 44.1kHz, 128kbps  
- **Duration**: 2-5 seconds
- **Layers**: Support for multi-layered celebrations
- **Style**: Triumphant, rewarding

### 🎬 Video Requirements

#### Evolution Sequences (`videos/mascot/evolution-sequences/`)
- **Format**: MP4, H.264 codec
- **Resolution**: 512x512px (square)
- **Frame Rate**: 30fps
- **Duration**: 3-5 seconds
- **Compression**: High quality with reasonable file size (<2MB)

## Implementation Integration

### Code Usage Pattern
```typescript
// Import pattern following existing logo structure
const mascotAssets = {
  stages: {
    seed: {
      small: require('@/assets/images/mascot/stages/seed/seed-small.png'),
      medium: require('@/assets/images/mascot/stages/seed/seed-medium.png'),
      large: require('@/assets/images/mascot/stages/seed/seed-large.png'),
    },
    flower: {
      small: require('@/assets/images/mascot/stages/flower/flower-small.png'),
      medium: require('@/assets/images/mascot/stages/flower/flower-medium.png'),
      large: require('@/assets/images/mascot/stages/flower/flower-large.png'),
    },
    tree: {
      small: require('@/assets/images/mascot/stages/tree/tree-small.png'),
      medium: require('@/assets/images/mascot/stages/tree/tree-medium.png'),
      large: require('@/assets/images/mascot/stages/tree/tree-large.png'),
    }
  },
  expressions: {
    happy: require('@/assets/images/mascot/expressions/happy/happy-default.png'),
    surprised: require('@/assets/images/mascot/expressions/surprised/surprised-default.png'),
    // ... other expressions
  },
  animations: {
    seedToFlower: require('@/assets/videos/mascot/evolution-sequences/seed-to-flower.mp4'),
    flowerToTree: require('@/assets/videos/mascot/evolution-sequences/flower-to-tree.mp4'),
    celebration: require('@/assets/images/mascot/animations/celebration/celebration-sequence.gif'),
  }
};
```

### Performance Considerations
- **Lazy Loading**: Load assets only when needed
- **Caching**: Cache frequently used assets in memory
- **Preloading**: Preload next stage assets when close to evolution
- **Compression**: Use optimized assets for mobile performance

## File Naming Conventions

### Images
- `{stage}-{size}-{variant}.png`
- Example: `seed-large-happy.png`, `flower-medium-proud.png`

### Animations  
- `{action}-{stage}-{variant}.gif`
- Example: `evolution-seed-to-flower.gif`, `celebration-tree-achievement.gif`

### Sounds
- `{event}-{intensity}-{variant}.mp3`
- Example: `achievement-medium-chime.mp3`, `levelup-high-fanfare.mp3`

### Videos
- `{transition}-{description}.mp4`
- Example: `seed-to-flower-evolution.mp4`, `tree-stage-celebration.mp4`

## Asset Creation Guidelines

### Visual Style
- Consistent with OMNII's brand colors and aesthetic
- Friendly, approachable, encouraging personality
- Clear distinction between stages while maintaining character identity
- Customizable color system support

### Animation Principles
- Smooth, natural movement
- Anticipation and follow-through
- Squash and stretch for organic feel
- Clear visual hierarchy

### Audio Design  
- Positive, uplifting tones
- Not intrusive or annoying
- Support for user preferences (volume, style)
- Accessible audio cues

## Related Files

- `components/achievements/MascotEvolution.tsx` - Main mascot component
- `hooks/useProfileXP.ts` - XP and stage management
- `src/types/achievements.ts` - Mascot-related types
- `context/ProfileContext.tsx` - Mascot customization state

## Best Practices

1. **Consistent Sizing**: Maintain aspect ratios across all variants
2. **Optimization**: Compress assets without quality loss
3. **Accessibility**: Provide alternative text and audio descriptions
4. **Testing**: Test on various devices for performance
5. **Versioning**: Version control asset updates
6. **Documentation**: Update this README when adding new assets 