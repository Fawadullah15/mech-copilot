/**
 * Mechanical Copilot | Professional CAD Workspace Design System
 * Reference-Driven Implementation: Blue, Purple, Black & Light Surfaces
 */

export const studioTokens = {
  colors: {
    // Primary Palette from Reference Screenshots
    canvas: '#F2F4FA',                 // Main background
    surfacePrimary: '#FFFFFF',         // Main surface
    surfaceSecondary: '#E9EDF7',       // Secondary surface
    surfaceSubtle: '#DCE7FF',          // Light blue subtle surface
    surfaceRaised: '#FFFFFF',          // High-elevation popovers
    
    // Dark Navigation & Secondary
    darkNav: '#111827',                // Dark navigation sidebar
    darkSecondary: '#1B2436',          // Dark secondary panels
    darkSurface: '#1F293D',            // Elevated dark card surface
    darkBorder: '#28344E',             // Dark border
    
    // Technical Text & Contrast
    textPrimary: '#172033',            // Primary text
    textSecondary: '#64708A',          // Secondary text
    textTertiary: '#8D9BB5',           // Fine hints, disabled
    textInverse: '#FFFFFF',            // High contrast text
    
    // Primary & Accent Colors
    electricBlue: '#315EDE',           // Electric blue primary action
    deepBlue: '#2446B8',               // Deep blue hover / emphasis
    royalPurple: '#7653C9',            // Royal purple secondary highlight
    lightPurple: '#EAE3FF',            // Light purple badge/tint
    lightBlue: '#DCE7FF',              // Light blue badge/tint
    
    // Architectural Borders & Dividers
    borderDefault: '#D9DFED',          // 1px panel border
    borderSubtle: '#E2E7F3',           // Subtle divider
    borderStrong: '#BCC7DE',           // Strong border
    borderAccent: '#315EDE',           // Active blue outline
    
    // Operational States
    success: '#39866B',                // Verified compliant
    successSubtle: '#EDF6F2',
    warning: '#C78B3B',                // Marginal warning
    warningSubtle: '#FBF5EE',
    error: '#C4515C',                  // Critical failure
    danger: '#C4515C',                 // Alias
    dangerSubtle: '#F9ECEB',
  },
  
  typography: {
    fontSans: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontDisplay: '"Space Grotesk", "Inter", -apple-system, sans-serif',
    fontMono: '"IBM Plex Mono", "JetBrains Mono", Menlo, Consolas, monospace',
    sizes: {
      micro: '10px',
      xs: '11px',
      sm: '12px',
      base: '13px',
      md: '14px',
      lg: '16px',
      xl: '18px',
      '2xl': '22px',
    },
  },
  
  radii: {
    sharp: '2px',
    subtle: '4px',
    input: '6px',
    card: '8px',
    pill: '9999px',
  },
  
  shadows: {
    flat: 'none',
    subtle: '0 1px 2px rgba(23, 32, 51, 0.04)',
    panel: '0 2px 8px -2px rgba(23, 32, 51, 0.06), 0 1px 2px rgba(23, 32, 51, 0.03)',
    overlay: '0 8px 24px -4px rgba(23, 32, 51, 0.12), 0 2px 6px -1px rgba(23, 32, 51, 0.06)',
    modal: '0 20px 48px -8px rgba(23, 32, 51, 0.18), 0 4px 12px rgba(23, 32, 51, 0.06)',
    blueGlow: '0 4px 14px 0 rgba(49, 94, 222, 0.35)',
    purpleGlow: '0 4px 14px 0 rgba(118, 83, 201, 0.35)',
  },
  
  transitions: {
    fast: '120ms cubic-bezier(0.16, 1, 0.3, 1)',
    normal: '200ms cubic-bezier(0.16, 1, 0.3, 1)',
    smooth: '300ms cubic-bezier(0.16, 1, 0.3, 1)',
  },
};

// Aliases for atelierTokens to maintain backwards compatibility
export const atelierTokens = {
  colors: {
    canvas: studioTokens.colors.canvas,
    surfacePrimary: studioTokens.colors.surfacePrimary,
    surfaceSecondary: studioTokens.colors.surfaceSecondary,
    surfaceSubtle: studioTokens.colors.surfaceSubtle,
    surfaceRaised: studioTokens.colors.surfaceRaised,
    textPrimary: studioTokens.colors.textPrimary,
    textSecondary: studioTokens.colors.textSecondary,
    textTertiary: studioTokens.colors.textTertiary,
    textInverse: studioTokens.colors.textInverse,
    borderSubtle: studioTokens.colors.borderSubtle,
    borderDefault: studioTokens.colors.borderDefault,
    borderStrong: studioTokens.colors.borderStrong,
    borderAccent: studioTokens.colors.electricBlue,
    accentPrimary: studioTokens.colors.electricBlue,
    accentPrimaryHover: studioTokens.colors.deepBlue,
    accentPrimarySubtle: studioTokens.colors.lightBlue,
    accentSecondary: studioTokens.colors.royalPurple,
    accentSecondarySubtle: studioTokens.colors.lightPurple,
    techInfo: studioTokens.colors.electricBlue,
    warning: studioTokens.colors.warning,
    warningSubtle: studioTokens.colors.warningSubtle,
    success: studioTokens.colors.success,
    successSubtle: studioTokens.colors.successSubtle,
    danger: studioTokens.colors.error,
    dangerSubtle: studioTokens.colors.dangerSubtle,
  },
  typography: studioTokens.typography,
  radii: studioTokens.radii,
  shadows: studioTokens.shadows,
  transitions: studioTokens.transitions,
};

// Backwards compatibility alias for existing code
export const tokens = {
  colors: {
    dark: {
      bgApp: studioTokens.colors.canvas,
      bgSidebar: studioTokens.colors.darkNav,
      bgSurface1: studioTokens.colors.surfacePrimary,
      bgSurface2: studioTokens.colors.surfaceSecondary,
      bgCard: studioTokens.colors.surfacePrimary,
      border: studioTokens.colors.borderDefault,
      borderAccent: studioTokens.colors.electricBlue,
      textPrimary: studioTokens.colors.textPrimary,
      textSecondary: studioTokens.colors.textSecondary,
      textMuted: studioTokens.colors.textTertiary,
      cyan: studioTokens.colors.electricBlue,
      cyanBright: studioTokens.colors.electricBlue,
      cyanMuted: studioTokens.colors.lightBlue,
      accentPurple: studioTokens.colors.royalPurple,
      accentPurpleBright: studioTokens.colors.lightPurple,
      amber: studioTokens.colors.warning,
      rose: studioTokens.colors.error,
      emerald: studioTokens.colors.success,
    },
    light: {
      bgApp: studioTokens.colors.canvas,
      bgSidebar: studioTokens.colors.darkNav,
      bgSurface1: studioTokens.colors.surfacePrimary,
      bgSurface2: studioTokens.colors.surfaceSecondary,
      bgCard: studioTokens.colors.surfacePrimary,
      border: studioTokens.colors.borderDefault,
      borderAccent: studioTokens.colors.electricBlue,
      textPrimary: studioTokens.colors.textPrimary,
      textSecondary: studioTokens.colors.textSecondary,
      textMuted: studioTokens.colors.textTertiary,
      cyan: studioTokens.colors.electricBlue,
      cyanBright: studioTokens.colors.electricBlue,
      cyanMuted: studioTokens.colors.lightBlue,
      accentPurple: studioTokens.colors.royalPurple,
      accentPurpleBright: studioTokens.colors.lightPurple,
      amber: studioTokens.colors.warning,
      rose: studioTokens.colors.error,
      emerald: studioTokens.colors.success,
    },
  },
};
