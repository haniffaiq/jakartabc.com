import * as React from 'react'

import { cn } from '../lib/cn'

export type ContactBlockProps = {
  heading: string
  partner: {
    name: string
    role: string
    email: string
    whatsapp?: string
    photoSrc?: string
  }
  className?: string
}

export function ContactBlock({ heading, partner, className }: ContactBlockProps) {
  const waHref = partner.whatsapp ? `https://wa.me/${partner.whatsapp.replace(/[^0-9]/g, '')}` : undefined

  return (
    <section className={cn('border-t border-ink-900/[0.08] py-16', className)}>
      <div className="mx-auto flex max-w-editorial flex-col items-start gap-6 px-6 md:flex-row md:items-center md:gap-8 md:px-10">
        {partner.photoSrc ? (
          <img src={partner.photoSrc} alt="" className="h-20 w-20 rounded-full object-cover" />
        ) : null}
        <div className="flex-1">
          <p className="font-body text-eyebrow uppercase tracking-[0.08em] text-ink-700">{heading}</p>
          <p className="mt-2 font-display text-display-md text-ink-900">{partner.name}</p>
          <p className="mt-1 font-body text-body-sm text-ink-700">{partner.role}</p>
          <p className="mt-4 font-body text-body-md">
            <a href={`mailto:${partner.email}`} className="text-ochre-700 underline-offset-4 hover:underline">
              {partner.email}
            </a>
            {waHref ? (
              <>
                <span aria-hidden className="mx-2 text-ink-500">
                  ·
                </span>
                <a href={waHref} className="text-ochre-700 underline-offset-4 hover:underline">
                  {partner.whatsapp}
                </a>
              </>
            ) : null}
          </p>
        </div>
      </div>
    </section>
  )
}
