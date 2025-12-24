import { z } from 'zod';

// Theme schema
export const AttractionThemeSchema = z.object({
  enabled: z.boolean().default(false),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#000000'),
  buttonTextColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#ffffff'),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#ffffff'),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#ffffff'),
  cardBackgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#ffffff'),
  inputBackgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#ffffff'),
  borderEnabled: z.boolean().default(false),
  borderColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#e5e7eb'),
  headerTextColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#111827'),
  bodyTextColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#6b7280'),
  fontFamily: z.string().default('Manrope')
}).partial();

// Branding schema
export const AttractionBrandingSchema = z.object({
  showOrgLogo: z.boolean().default(true),
  customHeaderText: z.string().max(500).optional(),
  showPoweredBy: z.boolean().default(true)
}).partial();

// Layout schema
export const AttractionLayoutSchema = z.object({
  bookingStyle: z.enum(['calendar', 'list', 'grid']).default('calendar'),
  showDescription: z.boolean().default(true),
  showDuration: z.boolean().default(true),
  showPrice: z.boolean().default(true)
}).partial();

// Booking text schema
export const AttractionBookingTextSchema = z.object({
  title: z.string().max(100).default('Ready to Book Your Experience?'),
  description: z.string().max(500).default('Choose your preferred date and time below.'),
  buttonText: z.string().max(50).default('Book Now')
}).partial();

// Expectations schema
export const AttractionExpectationsSchema = z.object({
  title: z.string().max(100).default('What to Expect'),
  items: z.array(z.string().max(200)).max(10).default([])
}).partial();

// Resource selection schema
export const AttractionResourceSelectionSchema = z.object({
  label: z.string().max(50).default('Select Resource (Optional)'),
  placeholder: z.string().max(100).default('Any available resource'),
  anyOption: z.string().max(50).default('Any Available Resource')
}).partial();

// Complete widget customization schema
export const AttractionWidgetCustomizationSchema = z.object({
  theme: AttractionThemeSchema.optional(),
  branding: AttractionBrandingSchema.optional(),
  layout: AttractionLayoutSchema.optional(),
  booking: AttractionBookingTextSchema.optional(),
  expectations: AttractionExpectationsSchema.optional(),
  resourceSelection: AttractionResourceSelectionSchema.optional()
}).partial();

// Email block schema
export const EmailBlockSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('header'),
    title: z.string().max(100).default('Booking Confirmed!')
  }),
  z.object({
    type: z.literal('text'),
    text: z.string().max(1000).optional(),
    html: z.string().max(2000).optional()
  }),
  z.object({
    type: z.literal('event_details'),
    showDate: z.boolean().default(true),
    showTime: z.boolean().default(true),
    showVenue: z.boolean().default(true),
    showResource: z.boolean().default(true),
    showPartySize: z.boolean().default(true),
    showTotal: z.boolean().default(true),
    showReference: z.boolean().default(true)
  }),
  z.object({
    type: z.literal('button'),
    buttonText: z.string().max(50).default('View Booking Details'),
    buttonUrl: z.string().url().optional()
  }),
  z.object({
    type: z.literal('image'),
    imageUrl: z.string().url()
  }),
  z.object({
    type: z.literal('footer'),
    text: z.string().max(500).default('Questions? Contact us anytime.')
  })
]);

// Email theme schema
export const EmailThemeSchema = z.object({
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#3b82f6'),
  headerBgColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#1f2937'),
  footerBgColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#f3f4f6'),
  textColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#374151'),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#ffffff'),
  fontFamily: z.string().default('Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif')
}).partial();

// Email customization schema
export const AttractionEmailCustomizationSchema = z.object({
  template: z.object({
    subject: z.string().max(200).optional(),
    blocks: z.array(EmailBlockSchema).max(20).optional(),
    theme: EmailThemeSchema.optional()
  }).optional(),
  branding: z.object({
    showLogo: z.boolean().default(true)
  }).optional()
}).partial();

// Operating hours schema
export const DayHoursSchema = z.object({
  open: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/), // HH:MM format
  close: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  closed: z.boolean().default(false)
});

export const OperatingHoursSchema = z.object({
  sunday: DayHoursSchema.optional(),
  monday: DayHoursSchema.optional(),
  tuesday: DayHoursSchema.optional(),
  wednesday: DayHoursSchema.optional(),
  thursday: DayHoursSchema.optional(),
  friday: DayHoursSchema.optional(),
  saturday: DayHoursSchema.optional()
}).partial();

// Booking form schema (for validation before submission)
export const BookingFormSchema = z.object({
  selectedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  selectedSlotId: z.string().uuid().nullable(),
  selectedResourceId: z.string().uuid().nullable(),
  partySize: z.number().int().min(1).max(50),
  customerName: z.string().min(1).max(100),
  customerEmail: z.string().email(),
  customerPhone: z.string().max(20).optional(),
  specialRequests: z.string().max(500).optional()
});

// Attraction data validation schema
export const AttractionDataSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().max(5000).nullable(),
  venue: z.string().max(200).nullable(),
  attraction_type: z.enum([
    'golf_simulator',
    'karaoke_room',
    'escape_room',
    'vr_experience',
    'bowling_lane',
    'conference_room',
    'studio',
    'tour',
    'workshop',
    'other'
  ]),
  duration_minutes: z.number().int().min(5).max(480),
  base_price: z.number().min(0),
  logo_url: z.string().url().nullable(),
  organization_id: z.string().uuid(),
  resource_label: z.string().max(50).nullable().optional(),
  operating_hours: OperatingHoursSchema.nullable().optional(),
  blackout_dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).nullable().optional(),
  widget_customization: AttractionWidgetCustomizationSchema.nullable().optional(),
  email_customization: AttractionEmailCustomizationSchema.nullable().optional()
});

// Type exports inferred from schemas
export type AttractionTheme = z.infer<typeof AttractionThemeSchema>;
export type AttractionBranding = z.infer<typeof AttractionBrandingSchema>;
export type AttractionLayout = z.infer<typeof AttractionLayoutSchema>;
export type AttractionBookingText = z.infer<typeof AttractionBookingTextSchema>;
export type AttractionExpectations = z.infer<typeof AttractionExpectationsSchema>;
export type AttractionResourceSelection = z.infer<typeof AttractionResourceSelectionSchema>;
export type AttractionWidgetCustomization = z.infer<typeof AttractionWidgetCustomizationSchema>;
export type EmailBlock = z.infer<typeof EmailBlockSchema>;
export type EmailTheme = z.infer<typeof EmailThemeSchema>;
export type AttractionEmailCustomization = z.infer<typeof AttractionEmailCustomizationSchema>;
export type OperatingHours = z.infer<typeof OperatingHoursSchema>;
export type DayHours = z.infer<typeof DayHoursSchema>;
export type BookingFormData = z.infer<typeof BookingFormSchema>;
export type AttractionData = z.infer<typeof AttractionDataSchema>;

// Validation helper functions
export function validateWidgetCustomization(data: unknown): AttractionWidgetCustomization {
  return AttractionWidgetCustomizationSchema.parse(data);
}

export function validateEmailCustomization(data: unknown): AttractionEmailCustomization {
  return AttractionEmailCustomizationSchema.parse(data);
}

export function validateOperatingHours(data: unknown): OperatingHours {
  return OperatingHoursSchema.parse(data);
}

export function validateBookingForm(data: unknown): BookingFormData {
  return BookingFormSchema.parse(data);
}

// Safe parse versions that return errors instead of throwing
export function safeValidateWidgetCustomization(data: unknown) {
  return AttractionWidgetCustomizationSchema.safeParse(data);
}

export function safeValidateEmailCustomization(data: unknown) {
  return AttractionEmailCustomizationSchema.safeParse(data);
}

export function safeValidateBookingForm(data: unknown) {
  return BookingFormSchema.safeParse(data);
}
