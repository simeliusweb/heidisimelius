import { useState } from "react";
import { format, parse } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, ExternalLink } from "lucide-react";

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
  ticketsUrl?: string;   // Optional URL for buying tickets
  performances: Performance[]; // This array must be pre-sorted by date
}

const EventGroup = ({ imageUrl, title, venue, description, eventPageUrl, ticketsUrl, performances }: EventGroupProps) => {
  const [visibleCount, setVisibleCount] = useState(5);
  const currentYear = new Date().getFullYear();

  const showMore = () => {
    setVisibleCount(prev => prev + 10);
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

  const visiblePerformances = performances.slice(0, visibleCount);
  const allVisible = visibleCount >= performances.length;

  return (
    <Card className="overflow-hidden max-w-[800px]">
      <CardContent className="p-0">
        {/* Image with Next Date Stamp */}
        <div className="relative w-full aspect-video">
          <img 
            src={imageUrl} 
            alt={title}
            className="w-full h-full object-cover"
          />
          {performances.length > 0 && (
            <div className="absolute top-0 left-4 bg-primary text-primary-foreground px-4 pb-2 pt-6 rounded-b-md shadow-lg">
              <span className="text-2xl font-bold">
                {formatDateStamp(performances[0].date)}
              </span>
            </div>
          )}
        </div>

        {/* Info Block */}
        <div className="p-6 md:p-8 space-y-4">
          <div>
            <h2 className="text-3xl md:text-4xl font-playfair font-extrabold text-foreground mb-2">
              {title}
            </h2>
            <p className="text-lg text-muted-foreground font-medium">
              {venue}
            </p>
          </div>

          <p className="text-base font-source-sans text-foreground/90 leading-relaxed">
            {description}
          </p>

          {/* Links Block */}
          {(eventPageUrl || ticketsUrl) && (
            <div className="flex flex-wrap gap-4 pt-2">
              {eventPageUrl && (
                <a 
                  href={eventPageUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:text-primary/80 underline underline-offset-4 transition-colors"
                >
                  Tapahtuman sivulle
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
              {ticketsUrl && (
                <a 
                  href={ticketsUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:text-primary/80 underline underline-offset-4 transition-colors"
                >
                  Liput
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          )}

          {/* Performances List */}
          <div className="pt-4 space-y-3">
            {visiblePerformances.map((performance, index) => (
              <div 
                key={index}
                className="flex items-center justify-between py-3 border-t border-border first:border-t-0"
              >
                <span className="text-2xl md:text-3xl font-bold text-foreground">
                  {formatDateDisplay(performance.date)}
                </span>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span className="text-base">
                    {formatTimeDisplay(performance.time)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Show More Button or Final Message */}
          {!allVisible && performances.length > 5 && (
            <div className="flex justify-center pt-4">
              <Button onClick={showMore} variant="outline">
                Näytä lisää
              </Button>
            </div>
          )}
          {allVisible && performances.length > 5 && (
            <p className="text-center text-muted-foreground pt-4">
              Siinä kaikki tämän tapahtuman keikat!
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default EventGroup;
