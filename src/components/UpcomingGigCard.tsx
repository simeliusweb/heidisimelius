import { Card, CardContent } from "@/components/ui/card";
import { Clock, MapPin } from "lucide-react";
import { format, parse } from "date-fns";

interface UpcomingGigCardProps {
  imageUrl: string;
  title: string;
  nextDate: string;
  nextTime: string;
  venue: string;
}

const UpcomingGigCard = ({
  imageUrl,
  title,
  nextDate,
  nextTime,
  venue,
}: UpcomingGigCardProps) => {
  // Parse the date and format it conditionally
  const dateObj = parse(nextDate, "dd.MM.yyyy", new Date());
  const currentYear = new Date().getFullYear();
  const formattedDate =
    dateObj.getFullYear() === currentYear
      ? format(dateObj, "d.M.")
      : format(dateObj, "d.M.yyyy");
  return (
    <Card className="overflow-hidden hover:border-secondary/60 transition-colors element-slight-glow">
      <CardContent className="p-0">
        {/* Image */}
        <div className="relative w-full aspect-video">
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {/* Title */}
          <h3 className="text-xl md:text-2xl font-playfair font-bold text-foreground">
            {title}
          </h3>

          {/* Date & Time */}
          <div className="space-y-1">
            <p className="text-lg font-bold">{formattedDate}</p>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">klo {nextTime}</span>
            </div>
          </div>

          {/* Venue */}
          <div className="flex items-center gap-2 ">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm font-medium">{venue}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UpcomingGigCard;
