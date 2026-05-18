import { describe, expect, it } from 'vitest'
import preset from '../../tailwind-preset'

function luminance(hex: string) {
  const channels = hex
    .replace('#', '')
    .match(/.{2}/g)
    ?.map((part) => parseInt(part, 16) / 255)

  if (!channels || channels.length !== 3) throw new Error(`Invalid color ${hex}`)

  const linearChannels = channels.map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  ) as [number, number, number]
  const [red, green, blue] = linearChannels

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

function contrastRatio(foreground: string, background: string) {
  const lighter = Math.max(luminance(foreground), luminance(background))
  const darker = Math.min(luminance(foreground), luminance(background))

  return (lighter + 0.05) / (darker + 0.05)
}

describe('tailwind-preset tokens', () => {
  it('keeps ochre text and CTA surfaces above WCAG AA contrast on bone', () => {
    const ochre600 = '#8a661b'
    const ochre700 = '#775716'
    const bone50 = '#FAF7F2'

    expect(contrastRatio(ochre700, bone50)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(bone50, ochre600)).toBeGreaterThanOrEqual(4.5)
  })

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
