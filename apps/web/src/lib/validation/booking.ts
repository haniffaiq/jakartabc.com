import { z } from 'zod'

export const WINDOWS = [
  'mon-am',
  'mon-pm',
  'tue-am',
  'tue-pm',
  'wed-am',
  'wed-pm',
  'thu-am',
  'thu-pm',
  'fri-am',
  'fri-pm',
] as const

export const bookingSchema = z.object({
  submissionId: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().email().max(200),
  company: z.string().trim().max(200).optional().default(''),
  phone: z.string().trim().max(40).optional().default(''),
  serviceSlug: z.string().trim().min(1).max(80),
  preferredWindows: z.array(z.enum(WINDOWS)).max(WINDOWS.length).optional().default([]),
  message: z.string().trim().min(10).max(4000),
  locale: z.enum(['en', 'id']).default('en'),
  hp: z.string().optional().default(''),
  turnstileToken: z.string().min(1),
})

export type BookingInput = z.infer<typeof bookingSchema>
