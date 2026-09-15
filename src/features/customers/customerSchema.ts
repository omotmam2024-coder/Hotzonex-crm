import { z } from 'zod'

export const customerFormSchema = z
  .object({
    type: z.enum(['individual', 'business', 'ngo', 'government', 'reseller']),
    fullName: z.string().optional(),
    businessName: z.string().optional(),
    phonePrimary: z
      .string()
      .min(7, 'Enter a phone number')
      .regex(/^[\d+()\s-]+$/, 'Digits only'),
    whatsapp: z.string().optional(),
    email: z.string().optional().refine((v) => !v || z.string().email().safeParse(v).success, 'Enter a valid email'),
    locationId: z.string().nullable(),
    businessUnits: z.array(z.enum(['wifi', 'services', 'refreshment'])).min(1, 'Pick at least one business unit'),
    status: z.enum(['lead', 'prospect', 'active', 'dormant', 'churned', 'blacklisted']),
    ownerId: z.string().nullable(),
    tags: z.array(z.string()),
    notes: z.string().optional(),
    optedOut: z.boolean(),
  })
  .refine((v) => (v.type === 'individual' ? !!v.fullName?.trim() : true), {
    message: 'Full name is required',
    path: ['fullName'],
  })
  .refine((v) => (v.type !== 'individual' ? !!v.businessName?.trim() : true), {
    message: 'Business/organisation name is required',
    path: ['businessName'],
  })

export type CustomerFormValues = z.infer<typeof customerFormSchema>

export const CUSTOMER_FORM_DEFAULTS: CustomerFormValues = {
  type: 'individual',
  fullName: '',
  businessName: '',
  phonePrimary: '',
  whatsapp: '',
  email: '',
  locationId: null,
  businessUnits: ['wifi'],
  status: 'lead',
  ownerId: null,
  tags: [],
  notes: '',
  optedOut: false,
}
