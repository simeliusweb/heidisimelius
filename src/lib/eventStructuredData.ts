import type { Gig } from "@/components/admin/GigsManager";
import { SITE_URL } from "@/config/metadata";

// Used for endDate when a gig has no end time of its own. Google flags events without
// endDate, and a concert or a musical rarely runs longer than this.
const DEFAULT_DURATION_MS = 2 * 60 * 60 * 1000;

/**
 * schema.org Event for one performance, following Google's Event rich result guidelines:
 * https://developers.google.com/search/docs/appearance/structured-data/event
 *
 * Search Console has flagged the old markup for missing endDate and offers.validFrom /
 * price / priceCurrency. endDate falls back to a typical show length; offers are only
 * emitted when there is a ticket link, and a price never gets guessed — a wrong price
 * in search results is worse than a missing-field warning.
 */
export const buildEventSchema = (gig: Gig) => {
  const start = new Date(gig.performance_date);
  const end = new Date(start.getTime() + DEFAULT_DURATION_MS);

  return {
    "@context": "https://schema.org",
    "@type": gig.gig_type === "Teatteri" ? "TheaterEvent" : "MusicEvent",
    name: gig.title,
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: gig.venue,
      address: {
        "@type": "PostalAddress",
        addressLocality: gig.address_locality,
        addressCountry: gig.address_country,
      },
    },
    image: [gig.image_url],
    description: gig.description,
    ...(gig.event_page_url && { url: gig.event_page_url }),
    performer: {
      "@type": "Person",
      name: "Heidi Simelius",
      url: SITE_URL,
    },
    ...(gig.tickets_url && {
      offers: {
        "@type": "Offer",
        url: gig.tickets_url,
        availability: "https://schema.org/InStock",
        // When the gig was published on the site — tickets were on sale by then.
        validFrom: new Date(gig.created_at).toISOString(),
      },
    }),
    ...(gig.organizer_name && {
      organizer: {
        "@type": "Organization",
        name: gig.organizer_name,
        ...(gig.organizer_url && { url: gig.organizer_url }),
      },
    }),
  };
};
