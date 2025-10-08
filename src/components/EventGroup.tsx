import { useState } from "react";
import { format, parse } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, ExternalLink, MapPin } from "lucide-react";

interface Performance {
  date: string; // Use ISO 8601 format, e.g., "2025-10-31"
  time: string; // e.g., "19:00"
}

interface EventGroupProps {
  imageUrl: string;
  title: string;
  venue: string;
  description: string;
  eventPageUrl?: string; // Optional URL for the event's main page
  ticketsUrl?: string; // Optional URL for buying tickets
  performances: Performance[]; // This array must be pre-sorted by date
  id?: string; // Optional ID for anchor linking
}

const EventGroup = ({
  imageUrl,
  title,
  venue,
  description,
  eventPageUrl,
  ticketsUrl,
  performances,
  id,
}: EventGroupProps) => {
  const [visibleCount, setVisibleCount] = useState(5);
  const currentYear = new Date().getFullYear();

  const showMore = () => {
    setVisibleCount((prev) => prev + 10);
  };

  const formatDateStamp = (dateString: string) => {
    const date = parse(dateString, "yyyy-MM-dd", new Date());
    return format(date, "dd.MM.");
  };

  const formatDateDisplay = (dateString: string) => {
    const date = parse(dateString, "yyyy-MM-dd", new Date());
    const year = date.getFullYear();
    if (year === currentYear) {
      return format(date, "dd.MM.");
    }
    return format(date, "dd.MM.yyyy");
  };

  const formatTimeDisplay = (timeString: string) => {
    return `klo ${timeString}`;
  };

  const totalPerformances = Array.isArray(performances)
    ? performances.length
    : 0;
  const visiblePerformances = performances.slice(
    0,
    Math.min(visibleCount, totalPerformances)
  );
  const canShowMore = totalPerformances > visiblePerformances.length;

  // Single-date layout
  if (performances.length === 1) {
    const performance = performances[0];

    return (
      <Card
        id={id}
        className="overflow-hidden max-w-[800px] mx-auto element-embedded-effect"
      >
        <CardContent className="p-0">
          {/* Image */}
          <div className="relative w-full aspect-video [clip-path:polygon(0_0,_100%_0%,_100%_100%,_0_95%)]">
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Responsive Content Layout */}
          <div className="flex flex-col sm:flex-row p-6 md:p-8 gap-6 md:gap-8">
            {/* Date/Time Column - Shows after content on mobile, left on desktop */}
            <div className="order-2 sm:order-1 sm:w-1/3 flex flex-col justify-start">
              <div className="space-y-2">
                <div className="text-4xl md:text-5xl font-bold text-secondary-foreground">
                  {formatDateDisplay(performance.date)}
                </div>
                <div className="flex items-center gap-2 text-lg">
                  <Clock className="w-5 h-5 text-muted-foreground" />
                  <span className="text-foreground">
                    {formatTimeDisplay(performance.time)}
                  </span>
                </div>
              </div>
            </div>

            {/* Content Column - Shows first on mobile, right on desktop */}
            <div className="order-1 sm:order-2 sm:w-2/3 space-y-4">
              <div>
                <h2 className="text-3xl md:text-4xl font-sans font-extrabold text-foreground mb-2">
                  {title}
                </h2>
                <div className="flex items-center gap-2 text-lg font-medium">
                  <MapPin className="w-5 h-5 text-muted-foreground" />
                  <p className="text-foreground">{venue}</p>
                </div>
              </div>

              <p className="text-base font-source-sans text-foreground/90 leading-relaxed italic">
                {description}
              </p>

              {/* Links Block */}
              {(eventPageUrl || ticketsUrl) && (
                <div className="flex flex-wrap gap-3 pt-2">
                  {eventPageUrl && (
                    <a
                      href={eventPageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 bg-border text-foreground py-1 px-3 rounded-full hover:bg-border/80 transition-colors element-embedded-effect"
                    >
                      Tapahtuman sivulle
                      <ExternalLink className="w-4 h-4 text-primary" />
                    </a>
                  )}
                  {ticketsUrl && (
                    <a
                      href={ticketsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 bg-border text-foreground py-1 px-3 rounded-full hover:bg-border/80 transition-colors element-embedded-effect"
                    >
                      Liput
                      <ExternalLink className="w-4 h-4 text-primary" />
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Multi-date layout (existing)
  return (
    <Card
      id={id}
      className="overflow-hidden max-w-[800px] mx-auto element-embedded-effect"
    >
      <CardContent className="p-0">
        {/* Image with Next Date Stamp */}
        <div className="relative w-full aspect-video [clip-path:polygon(0_0,_100%_0%,_100%_100%,_0_95%)]">
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover"
          />
          {performances.length > 0 && (
            <div className="absolute bottom-0 left-0 bg-border text-secondary-foreground px-4 pt-1 sm:pt-2 pb-3 sm:pb-5 lg:pb-6 xl:pb-8 rounded-tr-md shadow-lg">
              <span className="text-3xl md:text-4xl font-bold">
                {formatDateStamp(performances[0].date)}
              </span>
            </div>
          )}
        </div>

        {/* Info Block */}
        <div className="p-6 md:p-8 space-y-4">
          <div>
            <h2 className="text-3xl md:text-4xl font-sans font-extrabold text-foreground mb-2">
              {title}
            </h2>
            <div className="flex items-center gap-2 text-lg font-medium">
              <MapPin className="w-5 h-5 text-muted-foreground" />
              <p className="text-foreground">{venue}</p>
            </div>
          </div>

          <p className="text-base font-source-sans text-foreground/90 leading-relaxed italic">
            {description}
          </p>

          {/* Links Block */}
          {(eventPageUrl || ticketsUrl) && (
            <div className="flex flex-wrap gap-3 pt-2">
              {eventPageUrl && (
                <a
                  href={eventPageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 bg-border text-foreground py-1 px-3 rounded-full hover:bg-border/80 transition-colors element-embedded-effect"
                >
                  Tapahtuman sivulle
                  <ExternalLink className="w-4 h-4 text-primary" />
                </a>
              )}
              {ticketsUrl && (
                <a
                  href={ticketsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 bg-border text-foreground py-1 px-3 rounded-full hover:bg-border/80 transition-colors element-embedded-effect"
                >
                  Liput
                  <ExternalLink className="w-4 h-4 text-primary" />
                </a>
              )}
            </div>
          )}

          {/* Performances List */}
          <div className="pt-4 space-y-3">
            {visiblePerformances.map((performance, index) => (
              <div
                key={index}
                className="flex items-center gap-4 py-3 border-t border-border first:border-t-0"
              >
                <span className="text-3xl md:text-4xl font-bold text-foreground">
                  {formatDateDisplay(performance.date)}
                </span>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-base text-foreground">
                    {formatTimeDisplay(performance.time)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {canShowMore && (
            <div className="flex justify-center pt-4">
              <Button
                onClick={showMore}
                variant="outline"
                className="element-embedded-effect"
              >
                Näytä lisää
              </Button>
            </div>
          )}
          {!canShowMore && totalPerformances > 5 && (
            <p className="text-center text-foreground pt-4">
              Siinä kaikki tämän tapahtuman keikat!
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default EventGroup;
