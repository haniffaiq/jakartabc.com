export const subjects = {
  bookingLeadSales: (service: string, name: string) => `[Lead] ${service} — ${name}`,
  bookingLeadVisitor: {
    en: 'We received your request — Jakarta Business Center',
    id: 'Kami menerima permintaan Anda — Jakarta Business Center',
  },
  contactSales: (name: string) => `[Contact] ${name}`,
  contactVisitor: {
    en: 'Thanks for reaching out — Jakarta Business Center',
    id: 'Terima kasih sudah menghubungi — Jakarta Business Center',
  },
} as const
