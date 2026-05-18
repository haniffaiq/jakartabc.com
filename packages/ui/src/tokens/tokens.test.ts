import { describe, expect, it } from 'vitest'
import preset from '../../tailwind-preset'

describe('tailwind-preset tokens', () => {
  it('maps ink, bone, ochre color scales', () => {
    const colors = preset.theme?.extend?.colors as {
      ink: Record<number, string>
      bone: Record<number, string>
      ochre: Record<number, string>
    }
    expect(colors.ink[900]).toBe('var(--ink-900)')
    expect(colors.bone[50]).toBe('var(--bone-50)')
    expect(colors.ochre[600]).toBe('var(--ochre-600)')
  })

  it('exposes editorial font families', () => {
    const fonts = preset.theme?.extend?.fontFamily as { display: string; body: string }
    expect(fonts.display).toBe('var(--font-display)')
    expect(fonts.body).toBe('var(--font-body)')
  })
})
