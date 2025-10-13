import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TablesInsert } from "@/integrations/supabase/types";
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
import { Trash2, Upload } from "lucide-react";

export type PhotoSet = TablesInsert<"photo_sets">;

// Base Zod schema for validation
const basePhotoSetFormSchema = z.object({
  title: z.string().optional(),
  photographer_name: z.string().optional(),
  photographer_url: z
    .string()
    .url({ message: "Anna kelvollinen URL." })
    .optional()
    .or(z.literal("")),
  press_kit_zip: z.instanceof(File).optional(),
  alt_texts: z.array(
    z.string().min(1, { message: "Alt-teksti on pakollinen." })
  ),
  photographer_names: z
    .array(z.string().min(1, { message: "Valokuvaajan nimi on pakollinen." }))
    .optional(),
  photographer_urls: z.array(z.string()).optional(),
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

    // For press kits, require press_kit_zip
    if (isPressKit && !data.press_kit_zip) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["press_kit_zip"],
        message: "Press kitin .zip on pakollinen.",
      });
    }
  });
};

type PhotoSetFormValues = z.infer<typeof basePhotoSetFormSchema>;

interface AddPhotoSetFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess: () => void;
  isPressKit: boolean;
}

const AddPhotoSetForm = ({
  isOpen,
  onOpenChange,
  onSuccess,
  isPressKit,
}: AddPhotoSetFormProps) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [altTexts, setAltTexts] = useState<string[]>([]);
  const [photographerNames, setPhotographerNames] = useState<string[]>([]);
  const [photographerUrls, setPhotographerUrls] = useState<string[]>([]);
  const [imageDimensions, setImageDimensions] = useState<
    Array<{ width: number; height: number }>
  >([]);
  const [isCalculatingDimensions, setIsCalculatingDimensions] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<PhotoSetFormValues>({
    resolver: zodResolver(createPhotoSetFormSchema(isPressKit)),
    defaultValues: {
      title: "",
      photographer_name: "",
      photographer_url: "",
      press_kit_zip: undefined,
      alt_texts: [],
      photographer_names: [],
      photographer_urls: [],
    },
  });

  // Calculate image dimensions for each selected file
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

    setImageDimensions(dimensions);
    setIsCalculatingDimensions(false);
  };

  const handleFileChange = async (files: FileList | null) => {
    if (!files) return;

    const fileArray = Array.from(files);
    setSelectedFiles(fileArray);
    setAltTexts(new Array(fileArray.length).fill(""));
    setPhotographerNames(new Array(fileArray.length).fill(""));
    setPhotographerUrls(new Array(fileArray.length).fill(""));

    // Calculate dimensions
    await calculateImageDimensions(fileArray);
  };

  const handleAltTextChange = (index: number, value: string) => {
    const newAltTexts = [...altTexts];
    newAltTexts[index] = value;
    setAltTexts(newAltTexts);
  };

  const handlePhotographerNameChange = (index: number, value: string) => {
    const newNames = [...photographerNames];
    newNames[index] = value;
    setPhotographerNames(newNames);
  };

  const handlePhotographerUrlChange = (index: number, value: string) => {
    const newUrls = [...photographerUrls];
    newUrls[index] = value;
    setPhotographerUrls(newUrls);
  };

  const removeImage = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    const newAltTexts = altTexts.filter((_, i) => i !== index);
    const newNames = photographerNames.filter((_, i) => i !== index);
    const newUrls = photographerUrls.filter((_, i) => i !== index);
    const newDimensions = imageDimensions.filter((_, i) => i !== index);

    setSelectedFiles(newFiles);
    setAltTexts(newAltTexts);
    setPhotographerNames(newNames);
    setPhotographerUrls(newUrls);
    setImageDimensions(newDimensions);
  };

  const mutation = useMutation({
    mutationFn: async (data: PhotoSetFormValues) => {
      // Start upload progress toast
      const progressToast = toast({
        title: "Ladataan tiedostoja...",
        description: "0%",
      });

      // Upload images first
      const uploadedImages = await Promise.all(
        selectedFiles.map(async (file, index) => {
          const imageUrl = await uploadPhotoSetImage(file, (progress) => {
            progressToast.update({
              id: progressToast.id,
              description: `${progress}%`,
            });
          });
          const photoData: {
            src: string;
            width: number;
            height: number;
            alt: string;
            photographer_name?: string;
            photographer_url?: string;
          } = {
            src: imageUrl,
            width: imageDimensions[index]?.width || 1,
            height: imageDimensions[index]?.height || 1,
            alt: altTexts[index],
          };

          // Add photographer data for press kits
          if (isPressKit) {
            photoData.photographer_name = photographerNames[index];
            photoData.photographer_url = photographerUrls[index] || undefined;
          }

          return photoData;
        })
      );

      // Upload zip file if it's a press kit
      let zipUrl: string | null = null;
      if (isPressKit && data.press_kit_zip) {
        zipUrl = await uploadPressKitZip(data.press_kit_zip, (progress) => {
          progressToast.update({
            id: progressToast.id,
            description: `.zip-tiedosto: ${progress}%`,
          });
        });
      }

      // Update toast to show completion
      progressToast.update({
        id: progressToast.id,
        title: "Lataus valmis!",
        description: "Tietoja tallennetaan...",
      });

      // Get current gallery count for order_index assignment
      const { data: existingGalleries } = await supabase
        .from("photo_sets")
        .select("id")
        .eq("is_press_kit", false);

      const nextOrderIndex = existingGalleries?.length || 0;

      // Create photo set data
      const photoSetData: PhotoSet = {
        title: isPressKit ? "Press Kit" : data.title,
        photographer_name: isPressKit
          ? "Useita valokuvaajia"
          : data.photographer_name,
        photographer_url: isPressKit ? null : data.photographer_url || null,
        photos: uploadedImages,
        is_press_kit: isPressKit,
        press_kit_zip_url: zipUrl,
        order_index: isPressKit ? null : nextOrderIndex,
      };

      const { error } = await supabase.from("photo_sets").insert(photoSetData);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Onnistui!",
        description: `${
          isPressKit ? "Press kit" : "Kuvagalleria"
        } lisätty onnistuneesti.`,
      });
      queryClient.invalidateQueries({ queryKey: ["photo_sets"] });
      onSuccess();
      form.reset();
      setSelectedFiles([]);
      setAltTexts([]);
      setPhotographerNames([]);
      setPhotographerUrls([]);
      setImageDimensions([]);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Virhe",
        description: `Tallentaminen epäonnistui: ${error.message}`,
      });
    },
  });

  const onSubmit = (data: PhotoSetFormValues) => {
    // Update form data with current state
    data.alt_texts = altTexts;
    data.photographer_names = photographerNames;
    data.photographer_urls = photographerUrls;
    mutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Lisää uusi {isPressKit ? "press kit" : "kuvagalleria"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6 p-1"
          >
            {/* Only show set-level fields for regular galleries */}
            {!isPressKit && (
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

            {/* Image Upload */}
            <div className="space-y-4">
              <FormLabel>
                Kuvat <span className="text-secondary">*</span>
              </FormLabel>
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleFileChange(e.target.files)}
                className="placeholder:text-accent"
              />
              {selectedFiles.length === 0 && (
                <p className="text-sm text-destructive">
                  Lisää vähintään yksi kuva
                </p>
              )}
            </div>

            {/* Press Kit Zip Upload */}
            {isPressKit && (
              <div className="space-y-4">
                <FormLabel>
                  Press kitin .zip-tiedosto{" "}
                  <span className="text-secondary">*</span>
                </FormLabel>
                <Input
                  type="file"
                  accept=".zip"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      form.setValue("press_kit_zip", file);
                    }
                  }}
                  className="placeholder:text-accent"
                />
                <FormMessage>
                  {form.formState.errors.press_kit_zip?.message}
                </FormMessage>
              </div>
            )}

            {/* Image Previews and Alt Text Inputs */}
            {selectedFiles.length > 0 && (
              <div className="space-y-4">
                <FormLabel>
                  Kuvien alt-tekstit <span className="text-secondary">*</span>
                </FormLabel>
                {isCalculatingDimensions && (
                  <p className="text-sm text-accent">
                    Lasketaan kuvien kokoja...
                  </p>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedFiles.map((file, index) => (
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
                          onClick={() => removeImage(index)}
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
                        value={altTexts[index] || ""}
                        onChange={(e) =>
                          handleAltTextChange(index, e.target.value)
                        }
                        className="placeholder:text-accent text-sm"
                        rows={2}
                      />
                      {/* Per-photo photographer fields for press kits */}
                      {isPressKit && (
                        <>
                          <Input
                            placeholder="Valokuvaajan nimi *"
                            value={photographerNames[index] || ""}
                            onChange={(e) =>
                              handlePhotographerNameChange(
                                index,
                                e.target.value
                              )
                            }
                            className="placeholder:text-accent text-sm"
                          />
                          <Input
                            placeholder="Valokuvaajan URL (valinnainen)"
                            value={photographerUrls[index] || ""}
                            onChange={(e) =>
                              handlePhotographerUrlChange(index, e.target.value)
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
                {mutation.isPending ? "Tallennetaan..." : "Tallenna"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddPhotoSetForm;
