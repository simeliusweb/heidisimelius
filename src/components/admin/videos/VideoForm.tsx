import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { assertRowsChanged } from "@/lib/dbWrite";
import { Video, VideoInsert, VideoUpdate } from "./VideosManager";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface VideoFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  video: Video | null;
  section: "Musavideot" | "Muut videot";
}

const VideoForm = ({
  isOpen,
  onOpenChange,
  onSuccess,
  video,
  section,
}: VideoFormProps) => {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Initialize form data when dialog opens or video changes
  useEffect(() => {
    if (isOpen) {
      if (video) {
        setUrl(video.url);
        setTitle(video.title || "");
        setDescription(video.description || "");
        setIsFeatured(video.is_featured || false);
      } else {
        setUrl("");
        setTitle("");
        setDescription("");
        setIsFeatured(false);
      }
    }
  }, [isOpen, video]);

  // Extract video ID from YouTube URL for preview
  const getVideoId = (url: string) => {
    const match = url.match(
      /(?:youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/watch\?v=)([a-zA-Z0-9_-]+)/
    );
    return match ? match[1] : null;
  };

  const insertMutation = useMutation({
    mutationFn: async (videoData: VideoInsert) => {
      // Count the section's videos at save time: the cached list can still include a video
      // that was just deleted, which left a gap in order_index. After a delete the others are
      // re-indexed to 0..k-1, so the count is the next free index.
      const { count, error: countError } = await supabase
        .from("videos")
        .select("id", { count: "exact", head: true })
        .eq("section", videoData.section);
      if (countError) throw countError;
      const { error } = await supabase
        .from("videos")
        .insert({ ...videoData, order_index: count ?? 0 });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Onnistui!",
        description: "Video lisätty onnistuneesti.",
      });
      queryClient.invalidateQueries({ queryKey: ["videos"] });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Virhe",
        description: `Videon lisääminen epäonnistui: ${error.message}`,
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      videoId,
      videoData,
    }: {
      videoId: string;
      videoData: VideoUpdate;
    }) => {
      if (isFeatured && section === "Musavideot") {
        // First, unfeature all other music videos
        const { error: unfeatureError } = await supabase
          .from("videos")
          .update({ is_featured: false })
          .eq("section", "Musavideot");
        if (unfeatureError) throw unfeatureError;
      }

      // Then update the selected video
      const { data: changedRows, error } = await supabase
        .from("videos")
        .update(videoData)
        .eq("id", videoId)
        .select("id");
      if (error) throw error;
      assertRowsChanged(changedRows);
    },
    onSuccess: () => {
      toast({
        title: "Onnistui!",
        description: "Video päivitetty onnistuneesti.",
      });
      queryClient.invalidateQueries({ queryKey: ["videos"] });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Virhe",
        description: `Videon päivitys epäonnistui: ${error.message}`,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!url.trim()) {
      toast({
        variant: "destructive",
        title: "Virhe",
        description: "URL on pakollinen kenttä.",
      });
      return;
    }

    if (section === "Muut videot" && !title.trim()) {
      toast({
        variant: "destructive",
        title: "Virhe",
        description: "Otsikko on pakollinen kenttä muille videoille.",
      });
      return;
    }

    if (section === "Muut videot" && !description.trim()) {
      toast({
        variant: "destructive",
        title: "Virhe",
        description: "Kuvaus on pakollinen kenttä muille videoille.",
      });
      return;
    }

    const videoData = {
      url: url.trim(),
      section,
      ...(section === "Muut videot" && {
        title: title.trim(),
        description: description.trim(),
      }),
      ...(section === "Musavideot" && {
        is_featured: isFeatured,
      }),
    };

    if (video) {
      // Update existing video
      updateMutation.mutate({
        videoId: video.id,
        videoData,
      });
    } else {
      // Insert new video
      insertMutation.mutate(videoData);
    }
  };

  const isSubmitting = insertMutation.isPending || updateMutation.isPending;
  const videoId = getVideoId(url);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {video ? "Muokkaa videota" : "Lisää uusi video"}
          </DialogTitle>
          <DialogDescription className="text-foreground">
            {section === "Musavideot"
              ? "Lisää tai muokkaa musavideota. Voit asettaa videon ylimmäksi 'esittelyssä' olevaksi."
              : "Lisää tai muokkaa muuta videota."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="url">
              YouTube URL <span className="text-secondary">*</span>
            </Label>
            <Input
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="placeholder:text-accent text-foreground"
              required
            />
          </div>

          {section === "Muut videot" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="title">
                  Otsikko <span className="text-secondary">*</span>
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Videon otsikko"
                  required
                  className="placeholder:text-accent text-foreground"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">
                  Kuvaus <span className="text-secondary">*</span>
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Videon kuvaus"
                  rows={3}
                  required
                  className="placeholder:text-accent text-foreground"
                />
              </div>
            </>
          )}

          {section === "Musavideot" && (
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isFeatured"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="isFeatured">Aseta esittelyssä olevaksi</Label>
            </div>
          )}

          {/* Live Preview */}
          {videoId && (
            <div className="space-y-2">
              <Label>Esikatselu</Label>
              <div className="aspect-video rounded-lg overflow-hidden border">
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${videoId}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title="Video preview"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Peruuta
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? video
                  ? "Päivitetään..."
                  : "Lisätään..."
                : video
                ? "Päivitä video"
                : "Lisää video"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default VideoForm;
