import React from 'react';

interface BrandIconProps {
  size?: number;
  className?: string;
  variant?: 'filled' | 'outline' | 'monochrome';
}

/**
 * Precision mechanical brand icon.
 * Geometric construction: Concentric bearing race circle, precision hex-shaft hub,
 * and 45-degree torque load vectors symbolizing mechanical design & intelligence.
 */
export const BrandIcon: React.FC<BrandIconProps> = ({
  size = 24,
  className = '',
  variant = 'filled',
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
    >
      <defs>
        <linearGradient id="axis-grad-primary" x1="2" y1="2" x2="30" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
        <linearGradient id="axis-grad-accent" x1="6" y1="6" x2="26" y2="26" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>

      {/* Outer Precision Outer Ring / Chamfer */}
      <rect
        x="2.5"
        y="2.5"
        width="27"
        height="27"
        rx="7"
        stroke={variant === 'monochrome' ? 'currentColor' : 'url(#axis-grad-primary)'}
        strokeWidth="1.75"
        strokeOpacity="0.85"
        fill={variant === 'filled' ? 'rgba(37, 99, 235, 0.08)' : 'none'}
      />

      {/* Hexagonal Shaft Core */}
      <path
        d="M16 6.5L24.2272 11.25V20.75L16 25.5L7.77275 20.75V11.25L16 6.5Z"
        stroke={variant === 'monochrome' ? 'currentColor' : '#38bdf8'}
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill={variant === 'filled' ? 'rgba(56, 189, 248, 0.12)' : 'none'}
      />

      {/* Precision Bearing Bore Circle */}
      <circle
        cx="16"
        cy="16"
        r="4.75"
        stroke={variant === 'monochrome' ? 'currentColor' : '#ffffff'}
        strokeWidth="1.5"
      />

      {/* Center Centerline Crosshair Points */}
      <line x1="16" y1="13.5" x2="16" y2="18.5" stroke={variant === 'monochrome' ? 'currentColor' : '#38bdf8'} strokeWidth="1.25" strokeLinecap="round" />
      <line x1="13.5" y1="16" x2="18.5" y2="16" stroke={variant === 'monochrome' ? 'currentColor' : '#38bdf8'} strokeWidth="1.25" strokeLinecap="round" />

      {/* 45° Coordinate Torsional Vector Tick */}
      <circle cx="21.5" cy="10.5" r="1.25" fill={variant === 'monochrome' ? 'currentColor' : '#22d3ee'} />
      <circle cx="10.5" cy="21.5" r="1.25" fill={variant === 'monochrome' ? 'currentColor' : '#38bdf8'} />
    </svg>
  );
};
