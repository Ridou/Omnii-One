import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // OMNII Brand Colors - Space-separated RGB format for NativeWind
        "ai-start": "99 102 241",        // Primary brand color
        "ai-end": "147 51 234",          // Secondary brand color
        "omnii-background": "248 250 252", // Background
        "omnii-card": "255 255 255",     // Card background
        "omnii-border": "226 232 240",   // Border color
        "priority-high": "239 68 68",    // High priority red
        
        // Extended OMNII Colors
        "omnii-primary": "79 70 229",    // Primary purple
        "omnii-accent": "34 197 94",     // Success green
        "omnii-warning": "251 191 36",   // Warning yellow
        "omnii-danger": "239 68 68",     // Danger red
        "omnii-muted": "156 163 175",    // Muted gray
        
        // Typography Colors
        "omnii-text-primary": "15 23 42",     // Primary text color (slate-800)
        "omnii-text-secondary": "100 116 139", // Secondary text color (slate-500)
        
        // Additional Priority Colors
        "priority-medium": "251 191 36",       // Medium priority yellow  
        "priority-low": "34 197 94",           // Low priority green
        
        // MISSING COLORS: Referenced in global.css
        "success": "34 197 94",                // Success green (same as omnii-accent)
        "omnii-border-light": "241 245 249",  // Light border color
        
        // Dark Mode Colors
        "omnii-dark-background": "15 23 42",   // Dark background
        "omnii-dark-card": "30 41 59",         // Dark card background
        "omnii-dark-border": "51 65 85",       // Dark border
        "omnii-dark-text-primary": "248 250 252",    // Dark primary text
        "omnii-dark-text-secondary": "148 163 184",  // Dark secondary text
        "omnii-dark-border-light": "71 85 105",      // Dark light border
      },
      
      // Phase 3: Shadows and animations
      boxShadow: {
        "omnii-card": "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
        "omnii-elevated": "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
        "omnii-glow": "0 0 20px rgba(99, 102, 241, 0.3)",
      },
      
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "bounce-soft": "bounce 1s ease-in-out infinite",
        "shimmer": "shimmer 3s ease-in-out infinite",
        "fade-glow": "fade-glow 1.5s ease-in-out infinite",
      },
      
      // Phase 4: Typography and spacing
      fontFamily: {
        "omnii-sans": ["Styrene A", "Inter", "system-ui", "sans-serif"],
        "omnii-serif": ["Tiempos Text", "Georgia", "serif"],
        "omnii-mono": ["SF Mono", "Monaco", "monospace"],
      },
      
      fontSize: {
        "omnii-xs": ["12px", { lineHeight: "16px" }],
        "omnii-sm": ["14px", { lineHeight: "20px" }],
        "omnii-base": ["16px", { lineHeight: "24px" }],
        "omnii-lg": ["18px", { lineHeight: "28px" }],
        "omnii-xl": ["20px", { lineHeight: "32px" }],
      },
      
      spacing: {
        "omnii-xs": "8px",
        "omnii-sm": "12px", 
        "omnii-base": "16px",
        "omnii-lg": "24px",
        "omnii-xl": "32px",
      },
    },
  },
} satisfies Config;
