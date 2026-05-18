import type { Config } from 'tailwindcss'

const preset = {
  content: [],
  theme: {
    extend: {
      colors: {
        ink: {
          900: 'var(--ink-900)',
          700: 'var(--ink-700)',
          500: 'var(--ink-500)',
        },
        bone: {
          50: 'var(--bone-50)',
          100: 'var(--bone-100)',
          200: 'var(--bone-200)',
        },
        ochre: {
          600: 'var(--ochre-600)',
          700: 'var(--ochre-700)',
          100: 'var(--ochre-100)',
        },
        success: 'var(--success)',
        warning: 'var(--warning)',
        danger: 'var(--danger)',
        info: 'var(--info)',
        'rule-soft': 'var(--rule-soft)',
        'rule-firm': 'var(--rule-firm)',
      },
      fontFamily: {
        display: 'var(--font-display)',
        body: 'var(--font-body)',
        mono: 'var(--font-mono)',
      },
      fontSize: {
        'display-xl': [
          'var(--fs-display-xl)',
          { lineHeight: 'var(--lh-display-xl)', fontWeight: '400' },
        ],
        'display-lg': [
          'var(--fs-display-lg)',
          { lineHeight: 'var(--lh-display-lg)', fontWeight: '400' },
        ],
        'display-md': [
          'var(--fs-display-md)',
          { lineHeight: 'var(--lh-display-md)', fontWeight: '400' },
        ],
        'heading-lg': [
          'var(--fs-heading-lg)',
          { lineHeight: 'var(--lh-heading-lg)', fontWeight: '500' },
        ],
        'heading-md': [
          'var(--fs-heading-md)',
          { lineHeight: 'var(--lh-heading-md)', fontWeight: '500' },
        ],
        'body-lg': ['var(--fs-body-lg)', { lineHeight: 'var(--lh-body-lg)', fontWeight: '400' }],
        'body-md': ['var(--fs-body-md)', { lineHeight: 'var(--lh-body-md)', fontWeight: '400' }],
        'body-sm': ['var(--fs-body-sm)', { lineHeight: 'var(--lh-body-sm)', fontWeight: '400' }],
        'mono-sm': ['var(--fs-mono-sm)', { lineHeight: 'var(--lh-mono-sm)', fontWeight: '400' }],
        eyebrow: [
          'var(--fs-eyebrow)',
          {
            lineHeight: 'var(--lh-eyebrow)',
            fontWeight: '500',
            letterSpacing: 'var(--tracking-eyebrow)',
          },
        ],
      },
      spacing: {
        '2': 'var(--space-2)',
        '4': 'var(--space-4)',
        '8': 'var(--space-8)',
        '12': 'var(--space-12)',
        '16': 'var(--space-16)',
        '24': 'var(--space-24)',
        '32': 'var(--space-32)',
        '48': 'var(--space-48)',
        '64': 'var(--space-64)',
        '96': 'var(--space-96)',
        '128': 'var(--space-128)',
        '160': 'var(--space-160)',
      },
      maxWidth: {
        container: 'var(--container-max)',
        editorial: 'var(--container-editorial)',
        reading: 'var(--container-reading)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
      },
      transitionDuration: {
        fast: '150ms',
        reveal: '300ms',
      },
      keyframes: {
        'spin-slow': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'spin-slow': 'spin-slow 1.2s linear infinite',
      },
    },
  },
  plugins: [],
} satisfies Partial<Config>

export default preset
