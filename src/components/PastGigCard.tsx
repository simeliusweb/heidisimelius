import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar } from "lucide-react";

interface PastGigCardProps {
  imageUrl: string;
  title: string;
  gigType: "Musiikki" | "Teatteri";
  date: string;
  venue: string;
}

const PastGigCard = ({
  imageUrl,
  title,
  gigType,
  date,
  venue,
}: PastGigCardProps) => {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300 max-w-[300px] sm:max-w-full mx-auto">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_1.5fr] gap-0">
        {/* Left Column: Image Thumbnail */}
        <div className="relative w-full sm:h-48">
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover [clip-path:polygon(0_0,_100%_0%,_100%_100%,_0_95%)] sm:[clip-path:polygon(0%_0%,_95%_0%,_100%_100%,_0%_100%)]"
          />
        </div>

        {/* Right Column: Details */}
        <div className="p-6 flex flex-col justify-between gap-4">
          {/* Top Row: Title */}
          <div className="flex flex-col justify-center gap-3">
            <h3 className="text-2xl md:text-3xl font-playfair font-extrabold text-foreground">
              {title}
            </h3>
            {/* Gig Type Badge */}
            <Badge
              variant="outline"
              className="text-muted-foreground bg-border w-fit"
            >
              {gigType}
            </Badge>
          </div>

          {/* Bottom Row: Date and Venue */}
          <div className="flex flex-col gap-2 text-foreground/80">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-base font-source-sans">{date}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span className="text-base font-source-sans">{venue}</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default PastGigCard;
