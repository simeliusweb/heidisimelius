interface Performance {
  date: string;
  time: string;
  ticketUrl: string;
}

interface EventGroupProps {
  imageUrl: string;
  title: string;
  venue: string;
  description: string;
  performances: Performance[];
}

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const EventGroup = ({ imageUrl, title, venue, description, performances }: EventGroupProps) => {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
          {/* Left Column - Image */}
          <div className="relative aspect-video md:aspect-auto">
            <img 
              src={imageUrl} 
              alt={title}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Right Column - Details */}
          <div className="p-6 md:p-8 flex flex-col justify-between">
            <div className="space-y-4">
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
            </div>

            {/* Performances List */}
            <div className="mt-6 space-y-3">
              {performances.map((performance, index) => (
                <div 
                  key={index}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-3 border-t border-border first:border-t-0"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <span className="font-semibold text-foreground">
                      {performance.date}
                    </span>
                    <span className="text-muted-foreground">
                      {performance.time}
                    </span>
                  </div>
                  <Button 
                    asChild
                    className="w-full sm:w-auto"
                  >
                    <a href={performance.ticketUrl} target="_blank" rel="noopener noreferrer">
                      Osta liput
                    </a>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EventGroup;
