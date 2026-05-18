export const SERVICE_SLUGS = [
  'pt-pma-setup',
  'sector-licensing',
  'tax-accounting',
  'investor-kitas',
] as const

export type ServiceSlug = (typeof SERVICE_SLUGS)[number]
