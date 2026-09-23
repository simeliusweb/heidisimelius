import * as z from "zod";

/**
 * OFF until the gigs table has the ticket_price and duration_minutes columns. They are
 * added only in the new Supabase project, after the move off Lovable Cloud (see
 * docs/supabase-migration-plan.md, §6.2 and §9). The live Lovable DB does not have them,
 * so while this is false the admin forms neither show nor send the fields — sending them
 * would make every gig save fail. Flip to true once the migration is live.
 */
export const GIG_TICKET_FIELDS_ENABLED = false;

/**
 * Ticket price + show length, shared by AddGigForm and EditGigForm. Both feed the Event
 * structured data on /keikat (offers.price and endDate) — Google Search Console flags
 * gigs without them.
 */
export const gigTicketFieldsSchema = {
  ticket_price: z
    .string()
    .regex(/^\d+([.,]\d{1,2})?$/, { message: "Anna hinta numerona, esim. 25 tai 24,90." })
    .optional()
    .or(z.literal("")),
  duration_minutes: z
    .string()
    .regex(/^[1-9]\d{0,3}$/, { message: "Anna kesto minuutteina, esim. 120." })
    .optional()
    .or(z.literal("")),
};

/** Form strings -> nullable DB numbers. Empty clears the value. Sends nothing while disabled. */
export const parseGigTicketFields = (data: {
  ticket_price?: string;
  duration_minutes?: string;
}) =>
  GIG_TICKET_FIELDS_ENABLED
    ? {
        ticket_price: data.ticket_price ? Number(data.ticket_price.replace(",", ".")) : null,
        duration_minutes: data.duration_minutes ? Number(data.duration_minutes) : null,
      }
    : {};

/** DB numbers -> form strings. */
export const gigTicketFieldDefaults = (gig?: {
  ticket_price?: number | null;
  duration_minutes?: number | null;
} | null) => ({
  ticket_price: gig?.ticket_price != null ? String(gig.ticket_price).replace(".", ",") : "",
  duration_minutes: gig?.duration_minutes != null ? String(gig.duration_minutes) : "",
});
