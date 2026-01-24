import React from 'react';
import Svg, { Path, Circle, G, Rect, Polygon } from 'react-native-svg';

interface TabIconProps {
  size?: number;
  color?: string;
  focused?: boolean;
}

export const AnalyticsIcon: React.FC<TabIconProps> = ({ 
  size = 24, 
  color = '#000', 
  focused = false 
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 3v18h18"
      stroke={color}
      strokeWidth={focused ? 2.5 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M7 16l4-4 4 4 6-6"
      stroke={color}
      strokeWidth={focused ? 2.5 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Circle
      cx="17"
      cy="9"
      r="2"
      fill={focused ? color : 'none'}
      stroke={color}
      strokeWidth={focused ? 1.5 : 1}
    />
  </Svg>
);

export const AchievementsIcon: React.FC<TabIconProps> = ({ 
  size = 24, 
  color = '#000', 
  focused = false 
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
      fill={focused ? color : 'none'}
      stroke={color}
      strokeWidth={focused ? 1.5 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {focused && (
      <Circle
        cx="12"
        cy="12"
        r="3"
        fill="white"
        stroke={color}
        strokeWidth="1"
      />
    )}
  </Svg>
);

export const ApprovalsIcon: React.FC<TabIconProps> = ({ 
  size = 24, 
  color = '#000', 
  focused = false 
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle
      cx="12"
      cy="12"
      r="10"
      fill={focused ? `${color}20` : 'none'}
      stroke={color}
      strokeWidth={focused ? 2.5 : 2}
    />
    <Path
      d="M9 12l2 2 4-4"
      stroke={color}
      strokeWidth={focused ? 2.5 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {focused && (
      <G>
        <Circle cx="8" cy="8" r="1" fill={color} opacity="0.6" />
        <Circle cx="16" cy="8" r="1" fill={color} opacity="0.6" />
        <Circle cx="8" cy="16" r="1" fill={color} opacity="0.6" />
        <Circle cx="16" cy="16" r="1" fill={color} opacity="0.6" />
      </G>
    )}
  </Svg>
);

export const ChatIcon: React.FC<TabIconProps> = ({ 
  size = 24, 
  color = '#000', 
  focused = false 
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
      fill={focused ? `${color}20` : 'none'}
      stroke={color}
      strokeWidth={focused ? 2.5 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <G opacity={focused ? 1 : 0.8}>
      <Circle cx="9" cy="11" r="1" fill={color} />
      <Circle cx="12" cy="11" r="1" fill={color} />
      <Circle cx="15" cy="11" r="1" fill={color} />
    </G>
    {focused && (
      <Path
        d="M16 7h-8"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.6"
      />
    )}
  </Svg>
);

export const ProfileIcon: React.FC<TabIconProps> = ({ 
  size = 24, 
  color = '#000', 
  focused = false 
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
      stroke={color}
      strokeWidth={focused ? 2.5 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Circle
      cx="12"
      cy="7"
      r="4"
      fill={focused ? `${color}20` : 'none'}
      stroke={color}
      strokeWidth={focused ? 2.5 : 2}
    />
    {focused && (
      <G>
        <Circle cx="12" cy="7" r="2" fill={color} opacity="0.7" />
        <Path
          d="M8 19h8"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.6"
        />
      </G>
    )}
  </Svg>
);

// Brand-specific OMNII icon for center tab
export const OmniiCenterIcon: React.FC<TabIconProps> = ({ 
  size = 28, 
  color = '#667eea', 
  focused = false 
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle
      cx="12"
      cy="12"
      r="8"
      fill={focused ? color : `${color}40`}
      stroke={color}
      strokeWidth={focused ? 2 : 1.5}
    />
    <Circle
      cx="12"
      cy="12"
      r="4"
      fill="white"
      stroke={color}
      strokeWidth="1.5"
    />
    <Circle
      cx="12"
      cy="12"
      r="1.5"
      fill={color}
    />
    {focused && (
      <G>
        <Circle cx="12" cy="6" r="1" fill={color} opacity="0.6" />
        <Circle cx="12" cy="18" r="1" fill={color} opacity="0.6" />
        <Circle cx="6" cy="12" r="1" fill={color} opacity="0.6" />
        <Circle cx="18" cy="12" r="1" fill={color} opacity="0.6" />
      </G>
    )}
  </Svg>
);

export type { TabIconProps }; 