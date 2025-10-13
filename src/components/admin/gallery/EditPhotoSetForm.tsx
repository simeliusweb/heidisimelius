import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesUpdate } from "@/integrations/supabase/types";
import { uploadPhotoSetImage, uploadPressKitZip } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Trash2 } from "lucide-react";
import SortablePhotoItem from "./SortablePhotoItem";
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
export type PhotoSetUpdate = TablesUpdate<"photo_sets">;

// Base Zod schema for validation
const basePhotoSetFormSchema = z.object({
  title: z.string().optional(),
  photographer_name: z.string().optional(),
  photographer_url: z
    .string()
    .url({ message: "Anna kelvollinen URL." })
    .optional()
    .or(z.literal("")),
});

// Conditional validation schema factory
const createPhotoSetFormSchema = (isPressKit: boolean) => {
  return basePhotoSetFormSchema.superRefine((data, ctx) => {
    // For regular galleries, require title and photographer_name
    if (!isPressKit) {
      if (!data.title || data.title.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.too_small,
          minimum: 2,
          type: "string",
          inclusive: true,
          path: ["title"],
          message: "Otsikko on pakollinen.",
        });
      }

      if (!data.photographer_name || data.photographer_name.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.too_small,
          minimum: 2,
          type: "string",
          inclusive: true,
          path: ["photographer_name"],
          message: "Valokuvaajan nimi on pakollinen.",
        });
      }
    }
  });
};

type PhotoSetFormValues = z.infer<typeof basePhotoSetFormSchema>;

interface PhotoData {
  src: string;
  width: number;
  height: number;
  alt: string;
  photographer_name?: string;
  photographer_url?: string;
}

interface EditPhotoSetFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess: () => void;
  photoSet: PhotoSet | null;
}

const EditPhotoSetForm = ({
  isOpen,
  onOpenChange,
  onSuccess,
  photoSet,
}: EditPhotoSetFormProps) => {
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newAltTexts, setNewAltTexts] = useState<string[]>([]);
  const [newPhotographerNames, setNewPhotographerNames] = useState<string[]>(
    []
  );
  const [newPhotographerUrls, setNewPhotographerUrls] = useState<string[]>([]);
  const [newImageDimensions, setNewImageDimensions] = useState<
    Array<{ width: number; height: number }>
  >([]);
  const [isCalculatingDimensions, setIsCalculatingDimensions] = useState(false);
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [hasPhotoChanges, setHasPhotoChanges] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const form = useForm<PhotoSetFormValues>({
    resolver: zodResolver(
      createPhotoSetFormSchema(photoSet?.is_press_kit || false)
    ),
    defaultValues: {
      title: "",
      photographer_name: "",
      photographer_url: "",
    },
  });

  // Initialize form data when photoSet changes
  useEffect(() => {
    if (photoSet) {
      form.reset({
        title: photoSet.title,
        photographer_name: photoSet.photographer_name,
        photographer_url: photoSet.photographer_url || "",
      });
      setPhotos(photoSet.photos as unknown as PhotoData[]);
      setNewFiles([]);
      setNewAltTexts([]);
      setNewPhotographerNames([]);
      setNewPhotographerUrls([]);
      setNewImageDimensions([]);
      setZipFile(null);
      setHasPhotoChanges(false);
    }
  }, [photoSet, form]);

  // Calculate image dimensions for new files
  const calculateImageDimensions = async (files: File[]) => {
    setIsCalculatingDimensions(true);
    const dimensions: Array<{ width: number; height: number }> = [];

    for (const file of files) {
      try {
        const dimension = await new Promise<{ width: number; height: number }>(
          (resolve, reject) => {
            const img = new Image();
            img.onload = () => {
              resolve({ width: img.naturalWidth, height: img.naturalHeight });
            };
            img.onerror = () => reject(new Error("Failed to load image"));
            img.src = URL.createObjectURL(file);
          }
        );
        dimensions.push(dimension);
      } catch (error) {
        console.error("Error calculating dimensions:", error);
        dimensions.push({ width: 1, height: 1 }); // Fallback
      }
    }

    setNewImageDimensions(dimensions);
    setIsCalculatingDimensions(false);
  };

  const handleNewFileChange = async (files: FileList | null) => {
    if (!files) return;

    const fileArray = Array.from(files);
    setNewFiles(fileArray);
    setNewAltTexts(new Array(fileArray.length).fill(""));
    setNewPhotographerNames(new Array(fileArray.length).fill(""));
    setNewPhotographerUrls(new Array(fileArray.length).fill(""));
    setHasPhotoChanges(true);

    // Calculate dimensions
    await calculateImageDimensions(fileArray);
  };

  const handleNewAltTextChange = (index: number, value: string) => {
    const updatedAltTexts = [...newAltTexts];
    updatedAltTexts[index] = value;
    setNewAltTexts(updatedAltTexts);
  };

  const handleNewPhotographerNameChange = (index: number, value: string) => {
    const updatedNames = [...newPhotographerNames];
    updatedNames[index] = value;
    setNewPhotographerNames(updatedNames);
  };

  const handleNewPhotographerUrlChange = (index: number, value: string) => {
    const updatedUrls = [...newPhotographerUrls];
    updatedUrls[index] = value;
    setNewPhotographerUrls(updatedUrls);
  };

  const removeNewImage = (index: number) => {
    const updatedFiles = newFiles.filter((_, i) => i !== index);
    const updatedAltTexts = newAltTexts.filter((_, i) => i !== index);
    const updatedNames = newPhotographerNames.filter((_, i) => i !== index);
    const updatedUrls = newPhotographerUrls.filter((_, i) => i !== index);
    const updatedDimensions = newImageDimensions.filter((_, i) => i !== index);

    setNewFiles(updatedFiles);
    setNewAltTexts(updatedAltTexts);
    setNewPhotographerNames(updatedNames);
    setNewPhotographerUrls(updatedUrls);
    setNewImageDimensions(updatedDimensions);
  };

  const removeExistingPhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    setPhotos(newPhotos);
    setHasPhotoChanges(true);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = photos.findIndex((photo) => photo.src === active.id);
    const newIndex = photos.findIndex((photo) => photo.src === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const newPhotos = arrayMove(photos, oldIndex, newIndex);
    setPhotos(newPhotos);
    setHasPhotoChanges(true);
  };

  const mutation = useMutation({
    mutationFn: async (data: PhotoSetFormValues) => {
      if (!photoSet) throw new Error("No photo set selected");

      // Start upload progress toast if there are files to upload
      const hasFilesToUpload =
        newFiles.length > 0 || (photoSet.is_press_kit && zipFile);
      let progressToast: ReturnType<typeof toast> | null = null;

      if (hasFilesToUpload) {
        progressToast = toast({
          title: "Ladataan tiedostoja...",
          description: "0%",
        });
      }

      let updatedPhotos = [...photos];

      // Upload new images if any
      if (newFiles.length > 0) {
        const uploadedImages = await Promise.all(
          newFiles.map(async (file, index) => {
            const imageUrl = await uploadPhotoSetImage(file, (progress) => {
              if (progressToast) {
                progressToast.update({
                  id: progressToast.id,
                  description: `${progress}%`,
                });
              }
            });
            const photoData: PhotoData = {
              src: imageUrl,
              width: newImageDimensions[index]?.width || 1,
              height: newImageDimensions[index]?.height || 1,
              alt: newAltTexts[index],
            };

            // Add photographer data for press kits
            if (photoSet.is_press_kit) {
              photoData.photographer_name = newPhotographerNames[index];
              photoData.photographer_url =
                newPhotographerUrls[index] || undefined;
            }

            return photoData;
          })
        );
        updatedPhotos = [...updatedPhotos, ...uploadedImages];
      }

      // Upload new zip file if it's a press kit and zip file is provided
      let zipUrl = photoSet.press_kit_zip_url;
      if (photoSet.is_press_kit && zipFile) {
        zipUrl = await uploadPressKitZip(zipFile, (progress) => {
          if (progressToast) {
            progressToast.update({
              id: progressToast.id,
              description: `.zip-tiedosto: ${progress}%`,
            });
          }
        });
      }

      // Update toast to show completion if we had files to upload
      if (progressToast) {
        progressToast.update({
          id: progressToast.id,
          title: "Lataus valmis!",
          description: "Tietoja tallennetaan...",
        });
      }

      // If photos were reordered or new photos added, zip file becomes mandatory for press kits
      if (photoSet.is_press_kit && hasPhotoChanges && !zipFile && !zipUrl) {
        throw new Error(
          "Press kitin .zip-tiedosto on pakollinen kun kuvia muutetaan."
        );
      }

      // Create update data
      const updateData: PhotoSetUpdate = {
        title: data.title,
        photographer_name: data.photographer_name,
        photographer_url: data.photographer_url || null,
        photos: updatedPhotos as unknown as Tables<"photo_sets">["photos"],
        ...(photoSet.is_press_kit && zipUrl && { press_kit_zip_url: zipUrl }),
      };

      const { error } = await supabase
        .from("photo_sets")
        .update(updateData)
        .eq("id", photoSet.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Onnistui!",
        description: "Kuvagalleria päivitetty onnistuneesti.",
      });
      queryClient.invalidateQueries({ queryKey: ["photo_sets"] });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Virhe",
        description: `Päivitys epäonnistui: ${error.message}`,
      });
    },
  });

  const onSubmit = (data: PhotoSetFormValues) => {
    mutation.mutate(data);
  };

  if (!photoSet) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Muokkaa {photoSet.is_press_kit ? "Press Kit" : "Kuvagalleria"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6 p-1"
          >
            {/* Only show set-level fields for regular galleries */}
            {!photoSet.is_press_kit && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  name="title"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Otsikko <span className="text-secondary">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Otsikko"
                          className="placeholder:text-accent"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="photographer_name"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Valokuvaajan nimi{" "}
                        <span className="text-secondary">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Valokuvaajan nimi"
                          className="placeholder:text-accent"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="photographer_url"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Valokuvaajan URL</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://example.com"
                          className="placeholder:text-accent"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Existing Photos with Drag & Drop */}
            {photos.length > 0 && (
              <div className="space-y-4">
                <FormLabel>Nykyiset kuvat (vedä järjestääksesi)</FormLabel>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={photos.map((photo) => photo.src)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {photos.map((photo, index) => (
                        <SortablePhotoItem key={photo.src} id={photo.src}>
                          <div className="border rounded-lg p-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">
                                Kuva {index + 1}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="mr-4"
                                onClick={() => removeExistingPhoto(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="aspect-video bg-muted rounded overflow-hidden">
                              <img
                                src={photo.src}
                                alt={photo.alt}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <p className="text-xs text-foreground">
                              {photo.alt}
                            </p>
                            {photoSet.is_press_kit &&
                              photo.photographer_name && (
                                <p className="text-xs text-foreground">
                                  Kuva: {photo.photographer_name}
                                  {photo.photographer_url && (
                                    <a
                                      href={photo.photographer_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="ml-1 text-accent hover:underline"
                                    >
                                      ({photo.photographer_url})
                                    </a>
                                  )}
                                </p>
                              )}
                          </div>
                        </SortablePhotoItem>
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            )}

            {/* Add New Images */}
            <div className="space-y-4">
              <FormLabel>Lisää uusia kuvia</FormLabel>
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleNewFileChange(e.target.files)}
                className="placeholder:text-accent"
              />
            </div>

            {/* New Image Previews and Alt Text Inputs */}
            {newFiles.length > 0 && (
              <div className="space-y-4">
                <FormLabel>
                  Uusien kuvien tiedot <span className="text-secondary">*</span>
                </FormLabel>
                {isCalculatingDimensions && (
                  <p className="text-sm text-accent">
                    Lasketaan kuvien kokoja...
                  </p>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {newFiles.map((file, index) => (
                    <div
                      key={index}
                      className="border rounded-lg p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{file.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeNewImage(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="aspect-video bg-muted rounded overflow-hidden">
                        <img
                          src={URL.createObjectURL(file)}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <Textarea
                        placeholder="Kuvaile kuvaa alt-tekstillä..."
                        value={newAltTexts[index] || ""}
                        onChange={(e) =>
                          handleNewAltTextChange(index, e.target.value)
                        }
                        className="placeholder:text-accent text-sm"
                        rows={2}
                      />
                      {/* Per-photo photographer fields for press kits */}
                      {photoSet.is_press_kit && (
                        <>
                          <Input
                            placeholder="Valokuvaajan nimi *"
                            value={newPhotographerNames[index] || ""}
                            onChange={(e) =>
                              handleNewPhotographerNameChange(
                                index,
                                e.target.value
                              )
                            }
                            className="placeholder:text-accent text-sm"
                          />
                          <Input
                            placeholder="Valokuvaajan URL (valinnainen)"
                            value={newPhotographerUrls[index] || ""}
                            onChange={(e) =>
                              handleNewPhotographerUrlChange(
                                index,
                                e.target.value
                              )
                            }
                            className="placeholder:text-accent text-sm"
                          />
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Press Kit Zip Upload */}
            {photoSet.is_press_kit && (
              <div className="space-y-4">
                <FormLabel>
                  {hasPhotoChanges ? (
                    <>
                      Press kitin .zip-tiedosto{" "}
                      <span className="text-secondary">*</span>
                      <span className="text-sm text-accent block">
                        (Lataa uusi .zip-tiedosto aina kun kuvia muutetaan)
                      </span>
                    </>
                  ) : (
                    "Vaihda Press kitin .zip-tiedosto (valinnainen)"
                  )}
                </FormLabel>
                <Input
                  type="file"
                  accept=".zip"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    setZipFile(file || null);
                  }}
                  className="placeholder:text-accent"
                />
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
              >
                Peruuta
              </Button>
              <Button
                type="submit"
                disabled={mutation.isPending || isCalculatingDimensions}
              >
                {mutation.isPending ? "Päivitetään..." : "Päivitä"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EditPhotoSetForm;
