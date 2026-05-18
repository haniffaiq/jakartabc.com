import { Link } from '@/i18n/routing'
import type { ComponentProps } from 'react'

export type LocalizedLinkProps = ComponentProps<typeof Link>

export function LocalizedLink({ href, children, ...props }: LocalizedLinkProps) {
  return (
    <Link href={href} {...props}>
      {children}
    </Link>
  )
}
