import { Button } from "@/components/ui/button";
import ShadowHeading from "./ShadowHeading";

interface VideoData {
  url: string;
  title?: string;
  description?: string;
  isFeatured?: boolean;
}

interface VideosSectionProps {
  sectionTitle: string;
  videos: VideoData[];
  variant: "featured" | "list";
}

const VideosSection = ({
  sectionTitle,
  videos,
  variant,
}: VideosSectionProps) => {
  // Extract video ID from YouTube URL
  const getVideoId = (url: string) => {
    const match = url.match(
      /(?:youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/watch\?v=)([a-zA-Z0-9_-]+)/
    );
    return match ? match[1] : url;
  };

  if (variant === "featured") {
    // Find the featured video, or default to the first video
    const featuredVideo = videos.find((v) => v.isFeatured) || videos[0];
    const otherVideos = videos.filter((v) => v !== featuredVideo);

    return (
      <section className="container mx-auto px-6 py-16 md:py-24">
        <ShadowHeading
          title={sectionTitle}
          shadowColorClass="accent"
          shadowOpacity={100}
        />

        {/* Featured Video */}
        <div className="max-w-5xl mx-auto mb-16">
          <div className="aspect-video rounded-lg overflow-hidden custom-lifted-primary">
            <iframe
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${getVideoId(
                featuredVideo.url
              )}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={featuredVideo.title || "Featured video"}
            />
          </div>
        </div>

        {/* Other Videos Grid */}
        {otherVideos.length > 0 && (
          <div className="flex flex-wrap justify-center gap-6 max-w-6xl mx-auto mb-8">
            {otherVideos.map((video, index) => (
              <div
                key={index}
                className="w-full md:w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-1rem)] aspect-video overflow-hidden rounded-lg element-embedded-effect"
              >
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${getVideoId(video.url)}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={video.title || `Video ${index + 1}`}
                />
              </div>
            ))}
          </div>
        )}

        <div className="text-center">
          <Button asChild size="lg" className="custom-lifted-secondary">
            <a
              href="https://www.youtube.com/@heidisimelius?sub_confirmation=1"
              target="_blank"
              rel="noopener noreferrer"
            >
              Tilaa kanava
            </a>
          </Button>
        </div>
      </section>
    );
  }

  // List variant
  return (
    <section className="container mx-auto px-6 py-16 md:py-24">
      <ShadowHeading
        title={sectionTitle}
        shadowColorClass="accent"
        shadowOpacity={50}
      />

      <div className="max-w-4xl mx-auto space-y-12">
        {videos.map((video, index) => (
          <div
            key={index}
            className={`space-y-4 ${
              index > 0 ? "pt-12 border-t border-border" : ""
            }`}
          >
            {video.title && (
              <h3 className="text-xl md:text-2xl font-sans font-bold text-foreground">
                {video.title}
              </h3>
            )}
            <div className="aspect-video rounded-lg overflow-hidden">
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${getVideoId(video.url)}`}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={video.title || `Video ${index + 1}`}
              />
            </div>
            {video.description && (
              <p className="text-base md:text-lg italic">{video.description}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

export default VideosSection;
