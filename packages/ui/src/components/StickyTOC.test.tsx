import { act, render, screen } from '@testing-library/react'
import type * as React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { StickyTOC as ExportedStickyTOC, useScrollSpy as exportedUseScrollSpy } from '../index'
import { StickyTOC, useScrollSpy } from './StickyTOC'

const items = [
  { id: 'overview', label: 'Overview' },
  { id: 'requirements', label: 'Requirements' },
  { id: 'timeline', label: 'Timeline' },
]

describe('StickyTOC', () => {
  it('renders items as anchor links plus primary CTA', () => {
    render(<StickyTOC heading="On this page" items={items} primaryCta={{ label: 'Book', href: '/contact' }} activeId="overview" />)

    expect(screen.getByText('On this page')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute('href', '#overview')
    expect(screen.getByRole('link', { name: 'Book →' })).toHaveAttribute('href', '/contact')
  })

  it('marks active item with stronger style', () => {
    render(<StickyTOC heading="x" items={items} primaryCta={{ label: 'b', href: '/c' }} activeId="timeline" />)

    expect(screen.getByRole('link', { name: 'Timeline' })).toHaveClass('text-ink-900')
    expect(screen.getByRole('link', { name: 'Overview' })).toHaveClass('text-ink-500')
  })

  it('accepts a framework link component for CTA only', () => {
    function Link({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
      return (
        <a href={href} className={className} data-testid="custom-cta">
          {children}
        </a>
      )
    }

    render(<StickyTOC heading="x" items={items} primaryCta={{ label: 'Book', href: '/contact' }} Link={Link} />)

    expect(screen.getByTestId('custom-cta')).toHaveAttribute('href', '/contact')
  })

  it('uses sticky 200px sidebar layout without card shadow', () => {
    render(
      <StickyTOC
        heading="On this page"
        items={items}
        primaryCta={{ label: 'Book', href: '/contact' }}
        data-testid="toc"
      />,
    )

    const classList = Array.from(screen.getByTestId('toc').classList)
    expect(classList).toContain('sticky')
    expect(classList).toContain('top-24')
    expect(classList).toContain('w-[200px]')
    expect(classList.some((className) => className.includes('shadow'))).toBe(false)
  })

  it('exports StickyTOC and useScrollSpy from the package entrypoint', () => {
    expect(ExportedStickyTOC).toBe(StickyTOC)
    expect(exportedUseScrollSpy).toBe(useScrollSpy)
  })
})

describe('useScrollSpy', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    document.body.innerHTML = ''
  })

  it('observes section ids and activates intersecting section', () => {
    const callbacks: Array<(entries: Array<{ isIntersecting: boolean }>) => void> = []
    const observe = vi.fn()
    const disconnect = vi.fn()

    class MockIntersectionObserver {
      constructor(callback: (entries: Array<{ isIntersecting: boolean }>) => void) {
        callbacks.push(callback)
      }

      observe = observe
      disconnect = disconnect
    }

    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
    document.body.innerHTML = '<section id="overview"></section><section id="timeline"></section>'

    function Probe() {
      const activeId = useScrollSpy(['overview', 'timeline'])
      return <p data-testid="active">{activeId}</p>
    }

    render(<Probe />)

    expect(observe).toHaveBeenCalledTimes(2)
    expect(screen.getByTestId('active')).toHaveTextContent('overview')

    act(() => {
      callbacks[1]?.([{ isIntersecting: true }])
    })

    expect(screen.getByTestId('active')).toHaveTextContent('timeline')
  })
})
