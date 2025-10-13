import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Plus, Edit, Trash2, Image, Archive } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AddPhotoSetForm from "./AddPhotoSetForm";
import EditPhotoSetForm from "./EditPhotoSetForm";
import SortableGalleryItem from "./SortableGalleryItem";
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

export type PhotoSet = Tables<"photo_sets">;

const fetchPhotoSets = async (): Promise<PhotoSet[]> => {
  const { data, error } = await supabase
    .from("photo_sets")
    .select("*")
    .order("order_index", { ascending: true });
  if (error) throw new Error(error.message);
  return data;
};

const GalleryManager = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedPhotoSet, setSelectedPhotoSet] = useState<PhotoSet | null>(
    null
  );
  const [photoSetToDelete, setPhotoSetToDelete] = useState<PhotoSet | null>(
    null
  );
  const [addPhotoSetType, setAddPhotoSetType] = useState<
    "press_kit" | "gallery"
  >("gallery");

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
    data: photoSets,
    isLoading,
    error,
  } = useQuery<PhotoSet[]>({
    queryKey: ["photo_sets"],
    queryFn: fetchPhotoSets,
  });

  const deleteMutation = useMutation({
    mutationFn: async (photoSetId: string) => {
      const { error } = await supabase
        .from("photo_sets")
        .delete()
        .eq("id", photoSetId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Onnistui!",
        description: "Kuvagalleria poistettu onnistuneesti.",
      });
      queryClient.invalidateQueries({ queryKey: ["photo_sets"] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Virhe",
        description: `Poistaminen epäonnistui: ${error.message}`,
      });
    },
    onSettled: () => {
      setIsDeleteDialogOpen(false);
      setPhotoSetToDelete(null);
    },
  });

  const updateOrderMutation = useMutation({
    mutationFn: async (updates: Array<{ id: string; order_index: number }>) => {
      // Update each gallery's order_index
      for (const update of updates) {
        const { error } = await supabase
          .from("photo_sets")
          .update({ order_index: update.order_index })
          .eq("id", update.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Onnistui!",
        description: "Kuvagalleria järjestetty onnistuneesti.",
      });
      queryClient.invalidateQueries({ queryKey: ["photo_sets"] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Virhe",
        description: `Järjestäminen epäonnistui: ${error.message}`,
      });
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    // Only allow reordering within galleries (not press kits)
    const galleries = photoSets?.filter((set) => !set.is_press_kit) || [];
    const oldIndex = galleries.findIndex((gallery) => gallery.id === active.id);
    const newIndex = galleries.findIndex((gallery) => gallery.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // Create new ordered array
    const newOrderedList = arrayMove(galleries, oldIndex, newIndex);

    // Create updates for all affected galleries
    const updates = newOrderedList.map((gallery, index) => ({
      id: gallery.id,
      order_index: index,
    }));

    // Update order indices
    updateOrderMutation.mutate(updates);
  };

  const handleEditClick = (photoSet: PhotoSet) => {
    setSelectedPhotoSet(photoSet);
    setIsEditDialogOpen(true);
  };

  const handleAddNewClick = (type: "press_kit" | "gallery") => {
    setAddPhotoSetType(type);
    setSelectedPhotoSet(null);
    setIsAddDialogOpen(true);
  };

  const handleDeleteClick = (photoSet: PhotoSet) => {
    setPhotoSetToDelete(photoSet);
    setIsDeleteDialogOpen(true);
  };

  if (isLoading) return <div>Ladataan kuvagalleriaa...</div>;
  if (error) return <div>Virhe haettaessa kuvagalleriaa: {error.message}</div>;

  // Filter photo sets by type
  const pressKits = photoSets?.filter((set) => set.is_press_kit) || [];
  const galleries = photoSets?.filter((set) => !set.is_press_kit) || [];

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Press Kit Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5" />
              Press Kit
            </CardTitle>
            <Button
              onClick={() => handleAddNewClick("press_kit")}
              disabled={pressKits.length > 0}
            >
              <Plus className="mr-2 h-4 w-4" />
              {pressKits.length > 0
                ? "Press Kit on jo olemassa"
                : "Lisää Press Kit"}
            </Button>
          </CardHeader>
          <CardContent>
            {pressKits.length > 0 ? (
              <div className="space-y-4">
                {pressKits.map((pressKit) => (
                  <Card key={pressKit.id} className="overflow-hidden">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="aspect-video bg-muted rounded overflow-hidden">
                        {pressKit.photos &&
                        Array.isArray(pressKit.photos) &&
                        pressKit.photos.length > 0 ? (
                          <img
                            src={
                              (
                                pressKit.photos as unknown as Array<{
                                  src: string;
                                  alt: string;
                                }>
                              )[0]?.src
                            }
                            alt={
                              (
                                pressKit.photos as unknown as Array<{
                                  src: string;
                                  alt: string;
                                }>
                              )[0]?.alt || "Press kit image"
                            }
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Image className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="sm:col-span-2 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-lg font-semibold">
                            {pressKit.title}
                          </h3>
                        </div>
                        <p className="text-sm text-foreground mb-2">
                          Kuvat: {pressKit.photographer_name}
                          {pressKit.photographer_url && (
                            <a
                              href={pressKit.photographer_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-1 text-accent hover:underline"
                            >
                              ({pressKit.photographer_url})
                            </a>
                          )}
                        </p>
                        <p className="text-sm text-foreground mb-4">
                          Kuvia:{" "}
                          {Array.isArray(pressKit.photos)
                            ? pressKit.photos.length
                            : 0}
                          {pressKit.press_kit_zip_url && " + .zip kuvista"}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditClick(pressKit)}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Muokkaa
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteClick(pressKit)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Poista
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-accent">
                <Archive className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>
                  Ei press kittiä vielä lisättynä. Lisää ensimmäinen kuva
                  aloittaaksesi.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Photo Galleries Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              Kuvagalleria
            </CardTitle>
            <Button onClick={() => handleAddNewClick("gallery")}>
              <Plus className="mr-2 h-4 w-4" />
              Lisää uusi galleria
            </Button>
          </CardHeader>
          <CardContent>
            {galleries.length > 0 ? (
              <SortableContext
                items={galleries.map((gallery) => gallery.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-4">
                  {galleries.map((gallery) => (
                    <SortableGalleryItem key={gallery.id} id={gallery.id}>
                      <Card className="overflow-hidden">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="aspect-video bg-muted rounded overflow-hidden">
                            {gallery.photos &&
                            Array.isArray(gallery.photos) &&
                            gallery.photos.length > 0 ? (
                              <img
                                src={
                                  (
                                    gallery.photos as unknown as Array<{
                                      src: string;
                                      alt: string;
                                    }>
                                  )[0]?.src
                                }
                                alt={
                                  (
                                    gallery.photos as unknown as Array<{
                                      src: string;
                                      alt: string;
                                    }>
                                  )[0]?.alt || "Gallery image"
                                }
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Image className="h-8 w-8 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="sm:col-span-2 p-4">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="text-lg font-semibold">
                                {gallery.title}
                              </h3>
                            </div>
                            <p className="text-sm text-foreground mb-2">
                              Kuvat: {gallery.photographer_name}
                              {gallery.photographer_url && (
                                <a
                                  href={gallery.photographer_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="ml-1 text-accent hover:underline"
                                >
                                  ({gallery.photographer_url})
                                </a>
                              )}
                            </p>
                            <p className="text-sm text-foreground mb-4">
                              Kuvia:{" "}
                              {Array.isArray(gallery.photos)
                                ? gallery.photos.length
                                : 0}
                            </p>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditClick(gallery)}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Muokkaa
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteClick(gallery)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Poista
                              </Button>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </SortableGalleryItem>
                  ))}
                </div>
              </SortableContext>
            ) : (
              <div className="text-center py-8 text-accent">
                <Image className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>
                  Ei kuvagallerioita vielä lisättynä. Lisää ensimmäinen galleria
                  aloittaaksesi.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Form Dialogs */}
        <AddPhotoSetForm
          isOpen={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          onSuccess={() => setIsAddDialogOpen(false)}
          isPressKit={addPhotoSetType === "press_kit"}
        />
        <EditPhotoSetForm
          isOpen={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onSuccess={() => setIsEditDialogOpen(false)}
          photoSet={selectedPhotoSet}
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
                Tämä toiminto poistaa{" "}
                {photoSetToDelete?.is_press_kit
                  ? "press kitin"
                  : "kuvagallerian"}{" "}
                <span className="italic text-secondary">
                  {photoSetToDelete?.title}
                </span>{" "}
                pysyvästi. Toimintoa ei voi perua.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Peruuta</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (photoSetToDelete) {
                    deleteMutation.mutate(photoSetToDelete.id);
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

export default GalleryManager;
