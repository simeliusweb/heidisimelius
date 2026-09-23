-- Search Console flags every gig's Event structured data for missing offers.price /
-- priceCurrency and endDate. Both columns are optional: gigs without them still render,
-- they just keep the warning (price) or fall back to a 2 h duration (endDate).
ALTER TABLE public.gigs
  ADD COLUMN ticket_price numeric(8, 2) CHECK (ticket_price >= 0),
  ADD COLUMN duration_minutes smallint CHECK (duration_minutes > 0);

COMMENT ON COLUMN public.gigs.ticket_price IS 'Cheapest ticket in EUR (0 = free entry). Emitted as offers.price.';
COMMENT ON COLUMN public.gigs.duration_minutes IS 'Show length incl. intermission. Used for the Event endDate.';
