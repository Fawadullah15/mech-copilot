import React from 'react';

interface BrandIconProps {
  size?: number;
  className?: string;
  variant?: 'filled' | 'outline' | 'monochrome';
}

/**
 * Mechanical Copilot Faceted 'M' Mechanical CAD Emblem.
 * Geometric precision faceted 'M' with electric blue (#315EDE) and royal purple (#7653C9) gradients.
 */
export const BrandIcon: React.FC<BrandIconProps> = ({
  size = 28,
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
        <linearGradient id="mc-blue-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#315EDE" />
          <stop offset="100%" stopColor="#2446B8" />
        </linearGradient>
        <linearGradient id="mc-purple-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7653C9" />
          <stop offset="100%" stopColor="#512DA8" />
        </linearGradient>
        <linearGradient id="mc-facet-mid" x1="8" y1="8" x2="24" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4F75E8" />
          <stop offset="100%" stopColor="#6C4AB6" />
        </linearGradient>
      </defs>

      {/* Left Column of 'M' */}
      <path
        d="M5 26V8L12 16L9 26H5Z"
        fill="url(#mc-blue-grad)"
      />

      {/* Center Left Incline */}
      <path
        d="M12 16L16 22L9 26L12 16Z"
        fill="url(#mc-facet-mid)"
      />

      {/* Center Top Facet */}
      <path
        d="M5 8L16 6L12 16L5 8Z"
        fill="#315EDE"
      />

      {/* Center Right Incline */}
      <path
        d="M16 22L20 16L23 26L16 22Z"
        fill="url(#mc-purple-grad)"
      />

      {/* Center Right Top Facet */}
      <path
        d="M16 6L27 8L20 16L16 6Z"
        fill="#7653C9"
      />

      {/* Right Column of 'M' */}
      <path
        d="M27 8V26H23L20 16L27 8Z"
        fill="#5D35B0"
      />
    </svg>
  );
};
