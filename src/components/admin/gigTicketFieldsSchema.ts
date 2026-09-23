import * as z from "zod";

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

/** Form strings -> nullable DB numbers. Empty clears the value. */
export const parseGigTicketFields = (data: {
  ticket_price?: string;
  duration_minutes?: string;
}) => ({
  ticket_price: data.ticket_price ? Number(data.ticket_price.replace(",", ".")) : null,
  duration_minutes: data.duration_minutes ? Number(data.duration_minutes) : null,
});

/** DB numbers -> form strings. */
export const gigTicketFieldDefaults = (gig?: {
  ticket_price?: number | null;
  duration_minutes?: number | null;
} | null) => ({
  ticket_price: gig?.ticket_price != null ? String(gig.ticket_price).replace(".", ",") : "",
  duration_minutes: gig?.duration_minutes != null ? String(gig.duration_minutes) : "",
});
