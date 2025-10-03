import { Card, CardContent } from "@/components/ui/card";
import { Clock, MapPin } from "lucide-react";

interface UpcomingGigCardProps {
  imageUrl: string;
  title: string;
  nextDate: string;
  nextTime: string;
  venue: string;
}

const UpcomingGigCard = ({ imageUrl, title, nextDate, nextTime, venue }: UpcomingGigCardProps) => {
  return (
    <Card className="overflow-hidden hover:border-primary/50 transition-colors">
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
            <p className="text-lg font-medium text-foreground">
              {nextDate}
            </p>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span className="text-sm">klo {nextTime}</span>
            </div>
          </div>

          {/* Venue */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <p className="text-sm font-medium">{venue}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UpcomingGigCard;
