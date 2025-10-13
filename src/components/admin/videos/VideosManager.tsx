import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Tables,
  TablesInsert,
  TablesUpdate,
} from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash2, Play } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import VideoForm from "./VideoForm";
import SortableVideoItem from "./SortableVideoItem";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

export type Video = Tables<"videos">;
export type VideoInsert = TablesInsert<"videos">;
export type VideoUpdate = TablesUpdate<"videos">;

const fetchVideos = async (): Promise<Video[]> => {
  const { data, error } = await supabase
    .from("videos")
    .select("*")
    .order("order_index", { ascending: true });
  if (error) throw new Error(error.message);
  return data;
};

const VideosManager = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [videoToDelete, setVideoToDelete] = useState<Video | null>(null);
  const [addVideoSection, setAddVideoSection] = useState<
    "Musavideot" | "Muut videot"
  >("Musavideot");

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const {
    data: videos,
    isLoading,
    error,
  } = useQuery<Video[]>({ queryKey: ["videos"], queryFn: fetchVideos });

  // Filter videos by section
  const musicVideos =
    videos?.filter((video) => video.section === "Musavideot") || [];
  const otherVideos =
    videos?.filter((video) => video.section === "Muut videot") || [];

  const deleteMutation = useMutation({
    mutationFn: async (videoId: string) => {
      const { error } = await supabase
        .from("videos")
        .delete()
        .eq("id", videoId);
      if (error) throw error;
    },
    onSuccess: (_, deletedVideoId) => {
      // Re-index remaining videos in the same section
      const deletedVideo = videos?.find((video) => video.id === deletedVideoId);
      if (deletedVideo) {
        const sectionVideos =
          videos?.filter(
            (video) =>
              video.section === deletedVideo.section &&
              video.id !== deletedVideoId
          ) || [];

        if (sectionVideos.length > 0) {
          // Create re-indexing updates
          const reindexUpdates = sectionVideos.map((video, index) => ({
            id: video.id,
            order_index: index,
          }));

          // Update order indices
          updateOrderMutation.mutate(reindexUpdates);
        }
      }

      toast({
        title: "Onnistui!",
        description: "Video poistettu onnistuneesti.",
      });
      queryClient.invalidateQueries({ queryKey: ["videos"] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Virhe",
        description: `Videon poistaminen epäonnistui: ${error.message}`,
      });
    },
    onSettled: () => {
      setIsDeleteDialogOpen(false);
      setVideoToDelete(null);
    },
  });

  const updateFeaturedMutation = useMutation({
    mutationFn: async ({
      videoId,
      isFeatured,
    }: {
      videoId: string;
      isFeatured: boolean;
    }) => {
      if (isFeatured) {
        // First, unfeature all other music videos
        const { error: unfeatureError } = await supabase
          .from("videos")
          .update({ is_featured: false })
          .eq("section", "Musavideot");
        if (unfeatureError) throw unfeatureError;
      }

      // Then update the selected video
      const { error } = await supabase
        .from("videos")
        .update({ is_featured: isFeatured })
        .eq("id", videoId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Onnistui!",
        description: "Videon asetus päivitetty onnistuneesti.",
      });
      queryClient.invalidateQueries({ queryKey: ["videos"] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Virhe",
        description: `Videon päivitys epäonnistui: ${error.message}`,
      });
    },
  });

  const updateOrderMutation = useMutation({
    mutationFn: async (updates: { id: string; order_index: number }[]) => {
      // Update each video's order_index individually
      for (const update of updates) {
        const { error } = await supabase
          .from("videos")
          .update({ order_index: update.order_index })
          .eq("id", update.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Onnistui!",
        description: "Videoiden järjestys päivitetty onnistuneesti.",
      });
      queryClient.invalidateQueries({ queryKey: ["videos"] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Virhe",
        description: `Järjestyksen päivitys epäonnistui: ${error.message}`,
      });
    },
  });

  const handleEditClick = (video: Video) => {
    setSelectedVideo(video);
    setIsEditDialogOpen(true);
  };

  const handleAddNewClick = (section: "Musavideot" | "Muut videot") => {
    setAddVideoSection(section);
    setSelectedVideo(null);
    setIsAddDialogOpen(true);
  };

  const handleDeleteClick = (video: Video) => {
    setVideoToDelete(video);
    setIsDeleteDialogOpen(true);
  };

  const handleFeaturedToggle = (video: Video, isFeatured: boolean) => {
    updateFeaturedMutation.mutate({ videoId: video.id, isFeatured });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    // Determine which list was modified
    const activeVideo = videos?.find((video) => video.id === active.id);
    if (!activeVideo) return;

    const isMusicVideo = activeVideo.section === "Musavideot";
    const targetList = isMusicVideo ? musicVideos : otherVideos;
    const oldIndex = targetList.findIndex((video) => video.id === active.id);
    const newIndex = targetList.findIndex((video) => video.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // Create new ordered array
    const newOrderedList = arrayMove(targetList, oldIndex, newIndex);

    // Prepare database updates
    const updates = newOrderedList.map((video, index) => ({
      id: video.id,
      order_index: index,
    }));

    // Update database
    updateOrderMutation.mutate(updates);
  };

  // Extract video ID from YouTube URL
  const getVideoId = (url: string) => {
    const match = url.match(
      /(?:youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/watch\?v=)([a-zA-Z0-9_-]+)/
    );
    return match ? match[1] : url;
  };

  if (isLoading) return <div>Ladataan videoita...</div>;
  if (error) return <div>Virhe haettaessa videoita: {error.message}</div>;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Music Videos Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Musavideot</CardTitle>
            <Button onClick={() => handleAddNewClick("Musavideot")}>
              <Plus className="mr-2 h-4 w-4" />
              Lisää uusi video
            </Button>
          </CardHeader>
          <CardContent>
            {musicVideos.length > 0 ? (
              <SortableContext
                items={musicVideos.map((video) => video.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-4">
                  {musicVideos.map((video) => (
                    <SortableVideoItem key={video.id} id={video.id}>
                      <Card className="overflow-hidden">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="aspect-video">
                            <iframe
                              width="100%"
                              height="100%"
                              src={`https://www.youtube.com/embed/${getVideoId(
                                video.url
                              )}`}
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              title={video.title || "Music video"}
                            />
                          </div>
                          <div className="sm:col-span-2 p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <span className="text-sm text-foreground">
                                  Esittelyssä:
                                </span>
                                <Switch
                                  checked={video.is_featured || false}
                                  onCheckedChange={(checked) =>
                                    handleFeaturedToggle(video, checked)
                                  }
                                  disabled={updateFeaturedMutation.isPending}
                                />
                                <span className="text-sm text-foreground">
                                  {video.is_featured ? "(Näkyy ylimpänä)" : ""}
                                </span>
                              </div>
                            </div>
                            <p className="text-sm text-foreground break-all mb-4">
                              {video.url}
                            </p>
                            <div className="flex gap-2 mr-10">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditClick(video)}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Muokkaa
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteClick(video)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Poista
                              </Button>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </SortableVideoItem>
                  ))}
                </div>
              </SortableContext>
            ) : (
              <div className="text-center py-8 text-accent">
                <Play className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>
                  Ei musavideoita vielä lisättynä. Lisää ensimmäinen video
                  aloittaaksesi.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Other Videos Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Muut videot</CardTitle>
            <Button onClick={() => handleAddNewClick("Muut videot")}>
              <Plus className="mr-2 h-4 w-4" />
              Lisää uusi video
            </Button>
          </CardHeader>
          <CardContent>
            {otherVideos.length > 0 ? (
              <SortableContext
                items={otherVideos.map((video) => video.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-4">
                  {otherVideos.map((video) => (
                    <SortableVideoItem key={video.id} id={video.id}>
                      <Card className="overflow-hidden">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="aspect-video">
                            <iframe
                              width="100%"
                              height="100%"
                              src={`https://www.youtube.com/embed/${getVideoId(
                                video.url
                              )}`}
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              title={video.title || "Other video"}
                            />
                          </div>
                          <div className="sm:col-span-2 p-4">
                            <div className="flex items-start justify-between mb-2">
                              <h3 className="text-lg font-semibold mr-2">
                                {video.title}
                              </h3>
                            </div>
                            {video.description && (
                              <p className="text-foreground mb-3 italic">
                                {video.description}
                              </p>
                            )}
                            <p className="text-sm text-foreground break-all">
                              {video.url}
                            </p>
                          </div>
                          <div className="flex sm:col-span-3 justify-end gap-2 mr-10 mb-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditClick(video)}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Muokkaa
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteClick(video)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Poista
                            </Button>
                          </div>
                        </div>
                      </Card>
                    </SortableVideoItem>
                  ))}
                </div>
              </SortableContext>
            ) : (
              <div className="text-center py-8 text-accent">
                <Play className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>
                  Ei muita videoita vielä lisättynä. Lisää ensimmäinen video
                  aloittaaksesi.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Video Form Dialogs */}
        <VideoForm
          isOpen={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          onSuccess={() => setIsAddDialogOpen(false)}
          video={null}
          section={addVideoSection}
        />
        <VideoForm
          isOpen={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onSuccess={() => setIsEditDialogOpen(false)}
          video={selectedVideo}
          section={selectedVideo?.section || "Musavideot"}
        />

        {/* Delete Confirmation Dialog */}
        <AlertDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Oletko täysin varma?</AlertDialogTitle>
              <AlertDialogDescription className="text-accent">
                Tämä toiminto poistaa videon{" "}
                <span className="italic text-secondary">
                  {videoToDelete?.title || videoToDelete?.url}
                </span>{" "}
                pysyvästi. Toimintoa ei voi perua.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Peruuta</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (videoToDelete) {
                    deleteMutation.mutate(videoToDelete.id);
                  }
                }}
                disabled={deleteMutation.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteMutation.isPending ? "Poistetaan..." : "Kyllä, poista"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DndContext>
  );
};

export default VideosManager;
