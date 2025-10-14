import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { PageImagesContent } from "@/types/content";
import { uploadPageImage } from "@/lib/storage";
import { Loader2 } from "lucide-react";
import type { Json } from "@/integrations/supabase/types";

// Zod schema for validation
const imageFormSchema = z.object({
  imageFile: z
    .instanceof(File, { message: "Kuva on pakollinen." })
    .refine((file) => file.size > 0, { message: "Kuva on pakollinen." })
    .refine(
      (file) =>
        ["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(
          file.type
        ),
      { message: "Tuetut tiedostotyypit: JPG, PNG, WEBP." }
    ),
  alt: z.string().min(1, { message: "Alt-teksti on pakollinen." }),
});

type ImageFormValues = z.infer<typeof imageFormSchema>;

// Default content for when no data exists
const defaultPageImagesContent: PageImagesContent = {
  home_hero: {
    src: "/images/kuvat-Titta-Toivanen/Heidi-Simelius-kuvat-Titta-Toivanen-2-square.webp",
    alt: "Heidi Simelius on laulaja, lauluntekijä ja esiintyjä.",
  },
};

const fetchPageImagesContent = async (): Promise<PageImagesContent> => {
  const { data, error } = await supabase
    .from("page_content")
    .select("content")
    .eq("page_name", "page_images")
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // No data found, return default content
      return defaultPageImagesContent;
    }
    throw new Error(error.message);
  }

  return data.content as unknown as PageImagesContent;
};

const ImageManager = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch page images content
  const {
    data: pageImagesContent,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["page_content", "page_images"],
    queryFn: fetchPageImagesContent,
  });

  // Form setup
  const form = useForm<ImageFormValues>({
    resolver: zodResolver(imageFormSchema),
    defaultValues: {
      imageFile: undefined,
      alt: "",
    },
  });

  // Update page images content mutation
  const updatePageImagesMutation = useMutation({
    mutationFn: async (formData: ImageFormValues) => {
      // Upload the new image
      const imageUrl = await uploadPageImage(formData.imageFile);

      // Update the content
      const updatedContent: PageImagesContent = {
        home_hero: {
          src: imageUrl,
          alt: formData.alt,
        },
      };

      // Upsert the page content
      const { error } = await supabase.from("page_content").upsert({
        page_name: "page_images",
        content: updatedContent as unknown as Json,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        throw new Error(error.message);
      }

      return updatedContent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["page_content", "page_images"],
      });
      toast({
        title: "Onnistui!",
        description: "Etusivun pääkuva on päivitetty.",
      });
      form.reset();
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Virhe",
        description: error.message,
      });
    },
  });

  const onSubmit = (data: ImageFormValues) => {
    updatePageImagesMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-destructive">
          Virhe sivun kuvien lataamisessa: {error.message}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Etusivun pääkuva</CardTitle>
          <CardDescription className="text-foreground">
            Hallinnoi etusivun hero-kuvaa. Kuva näkyy etusivun yläosassa.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4">
          {/* Current Image Preview */}
          {pageImagesContent?.home_hero && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Nykyinen kuva:</h4>
              <div className="relative w-64 h-64 border rounded-lg overflow-hidden">
                <img
                  src={pageImagesContent.home_hero.src}
                  alt={pageImagesContent.home_hero.alt}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}

          {/* Update Form */}
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4 flex-1"
            >
              <FormField
                control={form.control}
                name="imageFile"
                render={({ field: { onChange, value, ...field } }) => (
                  <FormItem>
                    <FormLabel>
                      Uusi kuva <span className="text-secondary">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            onChange(file);
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="alt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Alt-teksti (ei näy käyttäjille){" "}
                      <span className="text-secondary">*</span>
                    </FormLabel>
                    <p className="text-sm text-accent">
                      Nykyinen alt-teksti: {pageImagesContent.home_hero.alt}
                    </p>
                    <FormControl>
                      <Input
                        {...field}
                        className="placeholder:text-accent"
                        placeholder="Kuvaile kuvaa"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={updatePageImagesMutation.isPending}
                className="flex w-fit ml-auto"
              >
                {updatePageImagesMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Päivitetään...
                  </>
                ) : (
                  "Päivitä etusivun pääkuva"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ImageManager;
