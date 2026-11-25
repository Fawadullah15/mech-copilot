/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Professional CAD Workspace Visual Identity (Blue, Purple, Dark & Light)
        cad: {
          canvas: '#F2F4FA',
          surface: '#FFFFFF',
          secondary: '#E9EDF7',
          subtle: '#DCE7FF',
          darkNav: '#111827',
          darkSecondary: '#1B2436',
          darkSurface: '#1F293D',
          darkBorder: '#28344E',
          border: '#D9DFED',
          borderSubtle: '#E2E7F3',
          borderStrong: '#BCC7DE',
          text: '#172033',
          textMuted: '#64708A',
          textTertiary: '#8D9BB5',
          blue: '#315EDE',
          deepBlue: '#2446B8',
          purple: '#7653C9',
          lightPurple: '#EAE3FF',
          lightBlue: '#DCE7FF',
          success: '#39866B',
          warning: '#C78B3B',
          error: '#C4515C',
        },
        // Mapped atelier tokens for backwards-compatibility
        atelier: {
          canvas: '#F2F4FA',
          surfacePrimary: '#FFFFFF',
          surfaceSecondary: '#E9EDF7',
          surfaceSubtle: '#DCE7FF',
          borderSubtle: '#E2E7F3',
          borderDefault: '#D9DFED',
          borderStrong: '#BCC7DE',
          textPrimary: '#172033',
          textSecondary: '#64708A',
          textTertiary: '#8D9BB5',
          accent: '#315EDE',
          accentHover: '#2446B8',
          accentSubtle: '#DCE7FF',
          accentBlue: '#315EDE',
          accentBlueSubtle: '#DCE7FF',
          techInfo: '#315EDE',
          warning: '#C78B3B',
          warningSubtle: '#FBF5EE',
          success: '#39866B',
          successSubtle: '#EDF6F2',
          danger: '#C4515C',
          dangerSubtle: '#F9ECEB',
        },
        // Mapped workstation palette
        workstation: {
          bg: '#F2F4FA',
          surface: '#FFFFFF',
          raised: '#E9EDF7',
          border: '#D9DFED',
          borderSubtle: '#E2E7F3',
          text: '#172033',
          textMuted: '#64708A',
          textDim: '#8D9BB5',
          accent: '#315EDE',
          accentHover: '#2446B8',
          accentDark: '#1E3B9E',
          warning: '#C78B3B',
          error: '#C4515C',
          pass: '#39866B',
        },
        // Mapped navy palette
        navy: {
          950: '#111827', // Dark Navigation
          900: '#1B2436', // Dark Secondary
          850: '#1F293D', // Dark Card
          800: '#E9EDF7', // Light Secondary
          750: '#DCE7FF',
          700: '#D9DFED', // Border
          600: '#BCC7DE',
          500: '#8D9BB5',
          400: '#64708A', // Secondary text
          300: '#172033', // Primary text
          200: '#F2F4FA',
          100: '#FFFFFF',
        },
        surface: {
          base: '#F2F4FA',
          panel: '#FFFFFF',
          raised: '#E9EDF7',
          sunken: '#111827',
          overlay: '#FFFFFF',
        },
        accent: {
          cyan: '#315EDE',
          'cyan-bright': '#315EDE',
          'cyan-muted': '#DCE7FF',
          purple: '#7653C9',
          'purple-bright': '#EAE3FF',
          'purple-subtle': '#F4F0FF',
        },
        cyan: {
          DEFAULT: '#315EDE',
          bright: '#315EDE',
          muted: '#DCE7FF',
          400: '#315EDE',
          500: '#2446B8',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Space Grotesk', 'Inter', '-apple-system', 'sans-serif'],
        mono: ['IBM Plex Mono', 'JetBrains Mono', 'Menlo', 'Consolas', 'monospace'],
      },
      boxShadow: {
        xs: '0 1px 2px rgba(23, 32, 51, 0.04)',
        subtle: '0 1px 2px rgba(23, 32, 51, 0.05)',
        panel: '0 2px 8px -2px rgba(23, 32, 51, 0.06), 0 1px 2px rgba(23, 32, 51, 0.03)',
        overlay: '0 8px 24px -4px rgba(23, 32, 51, 0.12), 0 2px 6px -1px rgba(23, 32, 51, 0.06)',
        modal: '0 20px 48px -8px rgba(23, 32, 51, 0.18), 0 4px 12px rgba(23, 32, 51, 0.06)',
        blueGlow: '0 4px 14px 0 rgba(49, 94, 222, 0.35)',
        purpleGlow: '0 4px 14px 0 rgba(118, 83, 201, 0.35)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(2px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-subtle': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
      },
      animation: {
        'fade-in': 'fade-in 150ms cubic-bezier(0.16, 1, 0.3, 1)',
        'pulse-subtle': 'pulse-subtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};
