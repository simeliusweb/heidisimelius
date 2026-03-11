import { Skeleton } from "@/components/ui/skeleton";
import LoadingSpinner from "./LoadingSpinner";

/** Full-height hero skeleton with centered dots and a title placeholder */
export const HeroSkeleton = ({
  height = "h-[80vh]",
}: {
  height?: string;
}) => (
  <section className={`relative ${height} flex items-end justify-center bg-background`}>
    <div className="absolute inset-0 flex items-center justify-center">
      <LoadingSpinner />
    </div>
    <div className="absolute bottom-0 translate-y-1/2 left-1/2 -translate-x-1/2">
      <Skeleton className="h-16 sm:h-20 lg:h-24 w-48 sm:w-64 lg:w-72 rounded-lg" />
    </div>
  </section>
);

/** Skeleton for a tagline line below hero */
export const TaglineSkeleton = () => (
  <div className="flex justify-center pt-8 md:pt-12 pb-8 px-4">
    <Skeleton className="h-6 sm:h-8 w-64 sm:w-80" />
  </div>
);

/** Skeleton for a paragraph block (multiple lines) */
export const ParagraphSkeleton = ({
  lines = 4,
  className = "",
}: {
  lines?: number;
  className?: string;
}) => (
  <div className={`space-y-3 ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton
        key={i}
        className={`h-4 ${i === lines - 1 ? "w-3/4" : "w-full"}`}
      />
    ))}
  </div>
);

/** Skeleton for a section heading */
export const HeadingSkeleton = ({ className = "" }: { className?: string }) => (
  <Skeleton className={`h-10 sm:h-12 w-64 sm:w-80 mb-8 ${className}`} />
);

/** Skeleton for an event/gig card */
export const EventCardSkeleton = () => (
  <div className="flex gap-4 p-4 rounded-lg border border-border bg-card max-w-[800px] mx-auto">
    <Skeleton className="h-24 w-24 rounded-lg flex-shrink-0" />
    <div className="flex-1 space-y-3">
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-1/3" />
    </div>
  </div>
);

/** Skeleton for the upcoming gig cards on homepage */
export const GigCardSkeleton = () => (
  <div className="basis-full md:basis-[calc(33.333%-1rem)] rounded-lg border border-border bg-card overflow-hidden">
    <Skeleton className="h-40 w-full" />
    <div className="p-4 space-y-3">
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  </div>
);

/** Skeleton for a photo grid */
export const PhotoGridSkeleton = ({ count = 6 }: { count?: number }) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-5xl mx-auto">
    {Array.from({ length: count }).map((_, i) => (
      <Skeleton
        key={i}
        className="w-full rounded-lg"
        style={{ height: `${180 + (i % 3) * 40}px` }}
      />
    ))}
  </div>
);

/** Skeleton for the video section */
export const VideoSkeleton = () => (
  <div className="max-w-3xl mx-auto">
    <Skeleton className="w-full aspect-video rounded-lg" />
  </div>
);

/** Skeleton for the pricing cards on laulunopetus page */
export const PricingCardsSkeleton = () => (
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
    {[1, 2, 3].map((i) => (
      <div key={i} className="bg-card rounded-lg p-6 border border-border">
        <div className="text-center space-y-3">
          <Skeleton className="h-5 w-32 mx-auto" />
          <Skeleton className="h-10 w-20 mx-auto" />
          <Skeleton className="h-4 w-16 mx-auto" />
        </div>
      </div>
    ))}
  </div>
);

/** Skeleton for a testimonial/quote block */
export const QuoteSkeleton = () => (
  <div className="mx-auto max-w-3xl rounded-lg bg-card p-8 space-y-4">
    <ParagraphSkeleton lines={3} />
    <div className="flex justify-end">
      <Skeleton className="h-4 w-24" />
    </div>
  </div>
);

/** Bio page content skeleton */
export const BioContentSkeleton = () => (
  <div className="px-8 space-y-8">
    <ParagraphSkeleton lines={6} />
    <VideoSkeleton />
    <QuoteSkeleton />
    <ParagraphSkeleton lines={4} />
  </div>
);

/** Keikat page content skeleton (event list) */
export const KeikatContentSkeleton = () => (
  <div className="space-y-6">
    {[1, 2].map((i) => (
      <EventCardSkeleton key={i} />
    ))}
  </div>
);
