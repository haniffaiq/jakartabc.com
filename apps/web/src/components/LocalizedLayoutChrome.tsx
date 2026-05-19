'use client'

import * as React from 'react'
import { FooterBlock, MobileMenu, NavBar } from '@jakartabc/ui'

import { usePathname, useRouter } from '@/i18n/routing'

import { LocalizedLink } from './LocalizedLink'

type NavCopy = {
  services: string
  insights: string
  about: string
  pricing: string
  cta: string
}

type FooterCopy = {
  address: string[]
  email: string
  licenses: string[]
}

type LocalizedLayoutChromeProps = {
  locale: 'en' | 'id'
  nav: NavCopy
  footer: FooterCopy
  children: React.ReactNode
}

export function LocalizedLayoutChrome({
  locale,
  nav,
  footer,
  children,
}: LocalizedLayoutChromeProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = React.useState(false)

  const items = [
    { label: nav.services, href: '/services' },
    { label: nav.insights, href: '/insights' },
    { label: nav.pricing, href: '/pricing' },
    { label: nav.about, href: '/about' },
  ]

  const onLocaleChange = (next: 'en' | 'id') => {
    router.replace(pathname, { locale: next })
  }

  return (
    <>
      <NavBar
        brand="jakartabc"
        items={items}
        cta={{ label: nav.cta, href: '/contact' }}
        locale={locale}
        onLocaleChange={onLocaleChange}
        onMobileOpen={() => setMenuOpen(true)}
        Link={LocalizedLink}
      />
      <MobileMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        brand="jakartabc"
        items={items}
        cta={{ label: nav.cta, href: '/contact' }}
        locale={locale}
        onLocaleChange={(next) => {
          setMenuOpen(false)
          onLocaleChange(next)
        }}
        Link={LocalizedLink}
      />
      <main>{children}</main>
      <FooterBlock
        brand="jakartabc"
        address={footer.address}
        email={footer.email}
        licenses={footer.licenses}
        legalLinks={[
          { label: 'Privacy', href: '/privacy' },
          { label: 'Terms', href: '/terms' },
        ]}
        Link={LocalizedLink}
        variant="dark"
      />
    </>
  )
}
