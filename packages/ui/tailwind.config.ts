import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './stories/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Hex-verified blue scale (primary interactive color)
        blue: {
          '50': '#EBF2FF',
          '100': '#D6E4FF',
          '200': '#ADC9FF',
          '300': '#85AEFF',
          '400': '#5C93FF',
          '500': '#3B82F6', // PRIMARY - links, focus rings, strings in code
          '600': '#2563EB',
          '700': '#1D4ED8',
          '800': '#1E40AF',
          '900': '#1E3A8A',
        },
        // Hex-verified purple scale (SQL keywords, AI features)
        purple: {
          '50': '#F5F3FF',
          '100': '#EDE9FE',
          '200': '#DDD6FE',
          '300': '#C4B5FD',
          '400': '#A78BFA',
          '500': '#8B5CF6', // PRIMARY - SQL keywords, AI highlights
          '600': '#7C3AED',
          '700': '#6D28D9',
          '800': '#5B21B6',
          '900': '#4C1D95',
        },
        // Hex-verified gray scale (backgrounds, text, borders)
        gray: {
          '50': '#F9FAFB', // Working status, elevated surfaces
          '100': '#F3F4F6', // User input bubbles, badges
          '200': '#E5E7EB', // Default borders, dividers
          '300': '#D1D5DB', // Input borders, loading dots
          '400': '#9CA3AF', // Placeholder text
          '500': '#6B7280', // User message text, secondary content
          '600': '#4B5563', // Working status text
          '700': '#374151', // List secondary text
          '800': '#1F2937', // Body text, code text
          '900': '#111827', // Headings, emphasis
        },
        // Hex-verified semantic colors
        green: {
          '500': '#10B981',
          '600': '#059669',
        },
        red: {
          '500': '#EF4444',
          '600': '#DC2626',
        },
        orange: {
          '500': '#F97316',
        },
        teal: {
          '500': '#14B8A6',
          '600': '#0D9488',
        },
        // Hex-specific background colors
        'off-white': '#FAFBFC', // Page background
        // shadcn/ui semantic tokens
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
        // AI-specific colors for agent interactions
        agent: {
          primary: 'hsl(217, 91%, 60%)',
          secondary: 'hsl(142, 76%, 36%)',
          tool: 'hsl(280, 65%, 60%)',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        mono: [
          'SF Mono',
          'Monaco',
          'Cascadia Code',
          'Roboto Mono',
          'Consolas',
          'monospace',
        ],
      },
      fontSize: {
        xs: '12px',
        sm: '13px', // Code text
        base: '14px', // Body text (PRIMARY)
        md: '15px',
        lg: '18px',
        xl: '24px', // Section headings
        '2xl': '28px',
        '3xl': '32px',
        '4xl': '40px',
      },
      borderRadius: {
        none: '0px',
        sm: '4px', // Badges, YML tags
        DEFAULT: '6px', // Code cells
        md: '8px', // Main cards, inputs, bubbles (PRIMARY)
        lg: '12px', // Large buttons, modals
        xl: '16px',
        '2xl': '24px',
        full: '9999px',
      },
      boxShadow: {
        // Hex uses VERY subtle shadows
        subtle: '0 1px 2px rgba(0, 0, 0, 0.04)',
        sm: '0 1px 3px rgba(0, 0, 0, 0.05)', // PRIMARY for cards
        DEFAULT: '0 1px 3px rgba(0, 0, 0, 0.05)',
        md: '0 2px 4px rgba(0, 0, 0, 0.06)',
        lg: '0 4px 6px rgba(0, 0, 0, 0.1)',
        xl: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(59, 130, 246, 0.7)' },
          '50%': { boxShadow: '0 0 0 10px rgba(59, 130, 246, 0)' },
        },
      },
    },
  },
  plugins: [
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('tailwindcss-animate'),
  ],
};

export default config;
