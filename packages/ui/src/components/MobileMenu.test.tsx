import { act, fireEvent, render, screen } from '@testing-library/react'
import * as React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { MobileMenu as ExportedMobileMenu } from '../index'
import { MobileMenu, type MobileMenuLinkProps } from './MobileMenu'

const items = [
  { label: 'Services', href: '/services' },
  { label: 'About', href: '/about' },
]

const baseProps = {
  brand: 'jakartabc',
  items,
  cta: { label: 'Book consultation', href: '/contact' },
  locale: 'en' as const,
  onLocaleChange: () => {},
}

function TestLink({ href, className, children, onClick }: MobileMenuLinkProps) {
  return (
    <a
      href={`/en${href}`}
      className={className}
      data-testid="localized-link"
      onClick={(event) => {
        event.preventDefault()
        onClick?.(event)
      }}
    >
      {children}
    </a>
  )
}

function installDesktopMediaQuery() {
  let matches = false
  const listeners = new Set<EventListenerOrEventListenerObject>()
  const addEventListener = vi.fn((_type: string, listener: EventListenerOrEventListenerObject) => {
    listeners.add(listener)
  })
  const removeEventListener = vi.fn(
    (_type: string, listener: EventListenerOrEventListenerObject) => {
      listeners.delete(listener)
    },
  )
  const mediaQuery = {
    get matches() {
      return matches
    },
    media: '(min-width: 768px)',
    onchange: null,
    addEventListener,
    removeEventListener,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(() => true),
  } as unknown as MediaQueryList

  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => mediaQuery),
  )

  return {
    mediaQuery,
    enterDesktop() {
      matches = true
      const event = { matches: true, media: mediaQuery.media } as MediaQueryListEvent
      for (const listener of listeners) {
        if (typeof listener === 'function') listener.call(mediaQuery, event)
        else listener.handleEvent(event)
      }
    },
  }
}

afterEach(() => {
  document.body.style.overflow = ''
  vi.unstubAllGlobals()
})

describe('MobileMenu', () => {
  it('renders nothing when closed', () => {
    render(<MobileMenu {...baseProps} open={false} onClose={() => {}} />)

    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('renders a full-screen dialog when open', () => {
    render(<MobileMenu {...baseProps} open onClose={() => {}} />)

    expect(screen.getByRole('dialog', { name: /menu/i })).toBeInTheDocument()
    expect(screen.getByText('jakartabc')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Services' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Book consultation' })).toBeInTheDocument()
  })

  it('focuses the close button when opened', () => {
    render(<MobileMenu {...baseProps} open onClose={() => {}} />)

    expect(screen.getByRole('button', { name: /close menu/i })).toHaveFocus()
  })

  it('wraps Tab and Shift+Tab within the dialog', () => {
    render(<MobileMenu {...baseProps} open onClose={() => {}} />)

    const first = screen.getByRole('button', { name: /close menu/i })
    const last = screen.getByRole('link', { name: 'Book consultation' })

    last.focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(first).toHaveFocus()

    first.focus()
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(last).toHaveFocus()
  })

  it('keeps focus stable when only one focusable control remains', () => {
    render(<MobileMenu {...baseProps} open onClose={() => {}} />)

    const close = screen.getByRole('button', { name: /close menu/i })
    for (const element of screen.getAllByRole('link')) element.tabIndex = -1
    for (const button of screen.getAllByRole('button')) {
      if (button !== close) button.setAttribute('disabled', '')
    }

    close.focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(close).toHaveFocus()

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(close).toHaveFocus()
  })

  it('falls back to the dialog when no focusable controls remain', () => {
    render(<MobileMenu {...baseProps} open onClose={() => {}} />)

    for (const element of screen.getAllByRole('link')) element.tabIndex = -1
    for (const button of screen.getAllByRole('button')) button.setAttribute('disabled', '')

    fireEvent.keyDown(document, { key: 'Tab' })

    expect(screen.getByRole('dialog')).toHaveFocus()
  })

  it('calls onClose from the close button and Escape key', () => {
    const onClose = vi.fn()
    render(<MobileMenu {...baseProps} open onClose={onClose} />)

    fireEvent.click(screen.getByRole('button', { name: /close menu/i }))
    fireEvent.keyDown(document, { key: 'Escape' })

    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('calls onClose when any navigation or CTA link is selected', () => {
    const onClose = vi.fn()
    render(<MobileMenu {...baseProps} open onClose={onClose} Link={TestLink} />)

    fireEvent.click(screen.getByRole('link', { name: 'Services' }))
    fireEvent.click(screen.getByRole('link', { name: 'About' }))
    fireEvent.click(screen.getByRole('link', { name: 'Book consultation' }))

    expect(onClose).toHaveBeenCalledTimes(3)
  })

  it('restores focus to the supplied trigger after closing', () => {
    function Harness() {
      const triggerRef = React.useRef<HTMLButtonElement>(null)
      const [open, setOpen] = React.useState(false)

      return (
        <>
          <button ref={triggerRef} type="button" onClick={() => setOpen(true)}>
            Open navigation
          </button>
          <MobileMenu
            {...baseProps}
            open={open}
            onClose={() => setOpen(false)}
            triggerRef={triggerRef}
          />
        </>
      )
    }

    render(<Harness />)
    const trigger = screen.getByRole('button', { name: 'Open navigation' })

    fireEvent.click(trigger)
    fireEvent.click(screen.getByRole('button', { name: /close menu/i }))

    expect(trigger).toHaveFocus()
  })

  it('locks body scroll while open and restores it on close', () => {
    const { rerender } = render(<MobileMenu {...baseProps} open onClose={() => {}} />)

    expect(document.body.style.overflow).toBe('hidden')

    rerender(<MobileMenu {...baseProps} open={false} onClose={() => {}} />)

    expect(document.body.style.overflow).toBe('')
  })

  it('restores body scroll through StrictMode remount cleanup', () => {
    document.body.style.overflow = 'scroll'
    const { unmount } = render(
      <React.StrictMode>
        <MobileMenu {...baseProps} open onClose={() => {}} />
      </React.StrictMode>,
    )

    expect(document.body.style.overflow).toBe('hidden')

    unmount()

    expect(document.body.style.overflow).toBe('scroll')
  })

  it('closes and releases focus handling when the viewport reaches desktop', () => {
    const desktop = installDesktopMediaQuery()

    function Harness() {
      const triggerRef = React.useRef<HTMLButtonElement>(null)
      const [open, setOpen] = React.useState(false)

      return (
        <>
          <button ref={triggerRef} type="button" onClick={() => setOpen(true)}>
            Open navigation
          </button>
          <MobileMenu
            {...baseProps}
            open={open}
            onClose={() => setOpen(false)}
            triggerRef={triggerRef}
          />
        </>
      )
    }

    render(<Harness />)
    const trigger = screen.getByRole('button', { name: 'Open navigation' })
    fireEvent.click(trigger)

    expect(document.body.style.overflow).toBe('hidden')

    act(() => desktop.enterDesktop())

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.body.style.overflow).toBe('')
    expect(trigger).toHaveFocus()
    expect(desktop.mediaQuery.removeEventListener).toHaveBeenCalled()

    const tab = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true })
    document.dispatchEvent(tab)
    expect(tab.defaultPrevented).toBe(false)
  })

  it('skips controls inside hidden and inert ancestors when wrapping focus', () => {
    render(<MobileMenu {...baseProps} open onClose={() => {}} />)

    const close = screen.getByRole('button', { name: /close menu/i })
    const services = screen.getByRole('link', { name: 'Services' })
    const about = screen.getByRole('link', { name: 'About' })
    const localeToggle = screen.getByRole('button', { name: /switch to indonesian/i })
    const cta = screen.getByRole('link', { name: 'Book consultation' })
    services.parentElement?.setAttribute('hidden', '')
    localeToggle.parentElement?.setAttribute('inert', '')
    if (cta.parentElement) cta.parentElement.style.display = 'none'

    about.focus()
    fireEvent.keyDown(document, { key: 'Tab' })

    expect(close).toHaveFocus()
  })

  it('does not trap Tab when the dialog is unavailable', () => {
    render(
      <>
        <button type="button">Outside</button>
        <MobileMenu {...baseProps} open onClose={() => {}} />
      </>,
    )

    const outside = screen.getByRole('button', { name: 'Outside' })
    const dialog = screen.getByRole('dialog')
    dialog.setAttribute('aria-hidden', 'true')
    outside.focus()

    const tab = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true })
    document.dispatchEvent(tab)

    expect(tab.defaultPrevented).toBe(false)
    expect(outside).toHaveFocus()
  })

  it('uses supplied localized dialog labels', () => {
    render(
      <MobileMenu
        {...baseProps}
        open
        onClose={() => {}}
        labels={{ dialog: 'Menu utama', close: 'Tutup menu', navigation: 'Navigasi utama' }}
      />,
    )

    expect(screen.getByRole('dialog', { name: 'Menu utama' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tutup menu' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Navigasi utama' })).toBeInTheDocument()
  })

  it('toggles locale to the opposite locale', () => {
    const onLocaleChange = vi.fn()
    render(<MobileMenu {...baseProps} open onClose={() => {}} onLocaleChange={onLocaleChange} />)

    fireEvent.click(screen.getByRole('button', { name: /switch to indonesian/i }))

    expect(onLocaleChange).toHaveBeenCalledWith('id')
  })

  it('covers DS §20 mobile nav and CTA state classes', () => {
    render(<MobileMenu {...baseProps} open onClose={() => {}} />)

    const servicesLink = screen.getByRole('link', { name: 'Services' })
    expect(servicesLink.className).toContain('hover:text-ochre-700')
    expect(servicesLink.className).toContain('active:text-ochre-700')
    expect(servicesLink.className).toContain('focus-visible:outline-ochre-600')

    const ctaLink = screen.getByRole('link', { name: 'Book consultation' })
    expect(ctaLink.className).toContain('bg-ochre-600')
    expect(ctaLink.className).toContain('hover:bg-ochre-700')
    expect(ctaLink.className).toContain('active:bg-ochre-700')
    expect(ctaLink.className).toContain('focus-visible:outline-ochre-600')
  })

  it('supports injectable locale-aware links', () => {
    render(<MobileMenu {...baseProps} open onClose={() => {}} Link={TestLink} />)

    expect(screen.getByRole('link', { name: 'Services' })).toHaveAttribute('href', '/en/services')
    expect(screen.getByRole('link', { name: 'Book consultation' })).toHaveAttribute(
      'href',
      '/en/contact',
    )
  })

  it('exports MobileMenu from the package entrypoint', () => {
    expect(ExportedMobileMenu).toBe(MobileMenu)
  })
})
