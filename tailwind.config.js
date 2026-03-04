/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        slate: {
          850: '#172033',
        },
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'tick-flash': 'tickFlash 1s ease-in-out infinite',
        'slide-in': 'slideIn 0.3s ease forwards',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(59,130,246,0.4)' },
          '50%':       { boxShadow: '0 0 0 6px rgba(59,130,246,0)' },
        },
        tickFlash: {
          '0%, 100%': { opacity: '1' },
          '50%':       { opacity: '0.4' },
        },
        slideIn: {
          from: { transform: 'translateX(120%)', opacity: '0' },
          to:   { transform: 'translateX(0)',    opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
