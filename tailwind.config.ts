import type { Config } from 'tailwindcss'

export default {
  content: ['./app/**/*.{vue,ts}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#0E0F11', 800: '#17191C', 700: '#22252A', 600: '#2F333A' },
        graphite: { DEFAULT: '#5B616B', 400: '#8A909A', 300: '#B4B8BF' },
        bone: { DEFAULT: '#F4F2EE', 200: '#EBE8E2', 300: '#DDD9D1' },
        forge: { DEFAULT: '#E4572E', 600: '#C8441E', 100: '#FBE6DF' },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'ui-sans-serif', 'sans-serif'],
      },
      letterSpacing: { tightest: '-0.04em' },
      transitionTimingFunction: { premium: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    },
  },
  plugins: [],
} satisfies Config
