import { z } from 'zod'

export const contactSchema = z.object({
  submissionId: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().email().max(200),
  company: z.string().trim().max(200).optional().default(''),
  message: z.string().trim().min(10).max(4000),
  locale: z.enum(['en', 'id']).default('en'),
  hp: z.string().optional().default(''),
  turnstileToken: z.string().optional().default(''),
})

export type ContactInput = z.infer<typeof contactSchema>
