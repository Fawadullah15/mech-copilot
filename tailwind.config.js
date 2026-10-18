/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Quantum AI Stage 5 Precision Engineering Workstation Palette
        workstation: {
          bg: '#111315',
          surface: '#191C1F',
          raised: '#22262A',
          border: '#34393F',
          borderSubtle: '#25292E',
          text: '#F0F1F2',
          textMuted: '#969DA5',
          textDim: '#636A73',
          accent: '#64D6C5',
          accentHover: '#52C4B3',
          accentDark: '#38A898',
          warning: '#E7B65C',
          error: '#E16D72',
          pass: '#34D399',
        },
        navy: {
          950: '#111315', // Main canvas background
          900: '#191C1F', // Workstation panel surface
          850: '#1D2125',
          800: '#22262A', // Raised card surface
          750: '#2B3036',
          700: '#34393F', // Fine technical borders
          600: '#464C54',
          500: '#5C646E',
          400: '#969DA5', // Secondary technical text
          300: '#B0B7C0',
          200: '#D2D7DE',
          100: '#F0F1F2', // Primary technical text
        },
        surface: {
          0: '#111315',
          1: '#191C1F',
          2: '#22262A',
          3: '#2B3036',
          4: '#34393F',
        },
        accent: {
          DEFAULT: '#64D6C5',
          dark: '#38A898',
          light: '#82E2D3',
          bright: '#64D6C5',
          glow: 'rgba(100, 214, 197, 0.15)',
        },
        cyan: {
          DEFAULT: '#64D6C5',
          light: '#82E2D3',
          dark: '#38A898',
        },
        status: {
          pass: '#34D399',
          warning: '#E7B65C',
          fail: '#E16D72',
          info: '#64D6C5',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      letterSpacing: {
        tighter: '-0.035em',
        tightest: '-0.05em',
        'mono-wide': '0.12em',
      },
      boxShadow: {
        'elevation-1': '0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 1px 2px -1px rgba(0, 0, 0, 0.3)',
        'elevation-2': '0 4px 14px -2px rgba(0, 0, 0, 0.45)',
        'elevation-3': '0 12px 30px -4px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.08)',
        'glow-accent': '0 0 20px -3px rgba(56, 189, 248, 0.3)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-in': 'slideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up': 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in': 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.96)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
