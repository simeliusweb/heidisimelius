import type { Gig } from "@/components/admin/GigsManager";

/**
 * The optional text fields come back from the DB as NULL. Form inputs need strings,
 * and the zod URL checks would otherwise reject NULL, so gigs without them could not
 * be edited or copied.
 */
export const optionalGigFieldDefaults = (gig: Gig) => ({
  event_page_url: gig.event_page_url ?? "",
  tickets_url: gig.tickets_url ?? "",
  organizer_name: gig.organizer_name ?? "",
  organizer_url: gig.organizer_url ?? "",
});
