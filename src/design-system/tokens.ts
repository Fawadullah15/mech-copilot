/**
 * Centralized Design Tokens for AXIS Mechanical Design Copilot.
 * Ensures consistent visual hierarchy, spacing, typography, and theme styling.
 */

export const tokens = {
  colors: {
    dark: {
      bgApp: '#060911',        // Base deep engineering canvas
      bgSidebar: '#090d18',    // Deep navigation panel
      bgSurface1: '#0e1424',   // Standard card & drawer background
      bgSurface2: '#141c30',   // Elevated card & hover state
      bgSurface3: '#1b253e',   // High-elevation popovers & active states
      borderSubtle: 'rgba(255, 255, 255, 0.07)',
      borderDefault: 'rgba(255, 255, 255, 0.12)',
      borderStrong: 'rgba(255, 255, 255, 0.22)',
      borderAccent: 'rgba(59, 130, 246, 0.4)',
      textPrimary: '#f8fafc',
      textSecondary: '#94a3b8',
      textTertiary: '#64748b',
      accentPrimary: '#38bdf8', // Cyan/electric blue
      accentDark: '#2563eb',
      accentCyan: '#06b6d4',
      statusPass: '#10b981',
      statusWarning: '#f59e0b',
      statusCritical: '#ef4444',
      statusInfo: '#3b82f6',
    },
    light: {
      bgApp: '#f8fafc',
      bgSidebar: '#f1f5f9',
      bgSurface1: '#ffffff',
      bgSurface2: '#f8fafc',
      bgSurface3: '#edf2f7',
      borderSubtle: 'rgba(0, 0, 0, 0.06)',
      borderDefault: 'rgba(0, 0, 0, 0.12)',
      borderStrong: 'rgba(0, 0, 0, 0.22)',
      borderAccent: 'rgba(37, 99, 235, 0.4)',
      textPrimary: '#0f172a',
      textSecondary: '#475569',
      textTertiary: '#94a3b8',
      accentPrimary: '#2563eb',
      accentDark: '#1d4ed8',
      accentCyan: '#0891b2',
      statusPass: '#059669',
      statusWarning: '#d97706',
      statusCritical: '#dc2626',
      statusInfo: '#2563eb',
    },
  },
  radii: {
    xs: '4px',
    sm: '6px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px',
  },
  shadows: {
    subtle: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    card: '0 4px 12px -2px rgba(0, 0, 0, 0.25)',
    modal: '0 20px 35px -5px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)',
    glow: '0 0 20px -2px rgba(56, 189, 248, 0.25)',
  },
  transitions: {
    fast: 'all 120ms cubic-bezier(0.4, 0, 0.2, 1)',
    normal: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
    smooth: 'all 300ms cubic-bezier(0.16, 1, 0.3, 1)',
  },
};
