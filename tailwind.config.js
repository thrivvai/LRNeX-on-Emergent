const { fontFamily } = require('tailwindcss/defaultTheme')

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        // LRNEX 2035 Brand System
        bg: '#0B1220',
        surface: 'rgba(255,255,255,0.03)',
        primary: '#2F8CFF',
        accent: '#E2B43C',
        success: '#16C784',
        danger: '#FF4D4F',
        
        // Extended palette for glassmorphism
        glass: {
          50: 'rgba(255,255,255,0.1)',
          100: 'rgba(255,255,255,0.08)',
          200: 'rgba(255,255,255,0.05)',
          300: 'rgba(255,255,255,0.03)',
        },
        
        // Semantic colors
        border: 'rgba(255,255,255,0.1)',
        input: 'rgba(255,255,255,0.05)',
        ring: '#2F8CFF',
        background: '#0B1220',
        foreground: '#ffffff',
        muted: {
          DEFAULT: 'rgba(255,255,255,0.1)',
          foreground: 'rgba(255,255,255,0.7)',
        },
        popover: {
          DEFAULT: 'rgba(11,18,32,0.95)',
          foreground: '#ffffff',
        },
        card: {
          DEFAULT: 'rgba(255,255,255,0.03)',
          foreground: '#ffffff',
        },
      },
      
      fontFamily: {
        sans: ['Inter', ...fontFamily.sans],
        mono: ['JetBrains Mono', ...fontFamily.mono],
      },
      
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        glow: {
          '0%': { boxShadow: '0 0 20px rgba(47, 140, 255, 0.5)' },
          '100%': { boxShadow: '0 0 30px rgba(47, 140, 255, 0.8)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      
      backdropBlur: {
        xs: '2px',
      },
      
      borderRadius: {
        lg: '12px',
        md: '8px',
        sm: '6px',
      },
      
      boxShadow: {
        'glass': '0 8px 32px rgba(0, 0, 0, 0.37)',
        'glow': '0 0 20px rgba(47, 140, 255, 0.5)',
        'soft': '0 2px 8px rgba(0, 0, 0, 0.15)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}