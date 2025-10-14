import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  PageImagesContent,
  PageImage,
  ResponsivePageImage,
} from "@/types/content";
import { uploadPageImage } from "@/lib/storage";
import { Loader2 } from "lucide-react";
import type { Json } from "@/integrations/supabase/types";
import SingleImageUploader from "./SingleImageUploader";
import DualImageUploader from "./DualImageUploader";
import { defaultPageImagesContent } from "@/lib/utils";

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

  // Update page images content mutation
  const updatePageImagesMutation = useMutation({
    mutationFn: async ({
      imageKey,
      imageData,
      imageFile,
    }: {
      imageKey: keyof PageImagesContent;
      imageData: PageImage;
      imageFile: File;
    }) => {
      // Upload the new image
      const imageUrl = await uploadPageImage(imageFile);

      // Merge with existing content
      const updatedContent: PageImagesContent = {
        ...pageImagesContent,
        [imageKey]: {
          src: imageUrl,
          alt: imageData.alt,
          photographer_name: imageData.photographer_name,
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
        description: "Kuva on päivitetty.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Virhe",
        description: error.message,
      });
    },
  });

  const handleImageUpdate = async (
    imageKey: keyof PageImagesContent,
    imageData: PageImage,
    imageFile: File
  ) => {
    // Upload the new image
    const imageUrl = await uploadPageImage(imageFile);

    // Merge with existing content
    const updatedContent: PageImagesContent = {
      ...pageImagesContent,
      [imageKey]: {
        src: imageUrl,
        alt: imageData.alt,
        photographer_name: imageData.photographer_name,
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

    queryClient.invalidateQueries({
      queryKey: ["page_content", "page_images"],
    });

    toast({
      title: "Onnistui!",
      description: "Kuva on päivitetty.",
    });
  };

  const handleDualImageUpdate = async (
    imageKey: keyof Pick<PageImagesContent, "bio_hero" | "bilebandi_hero">,
    imageData: ResponsivePageImage,
    desktopFile: File,
    mobileFile: File
  ) => {
    // Upload both images
    const desktopImageUrl = await uploadPageImage(desktopFile);
    const mobileImageUrl = await uploadPageImage(mobileFile);

    // Merge with existing content
    const updatedContent: PageImagesContent = {
      ...pageImagesContent,
      [imageKey]: {
        desktop: {
          src: desktopImageUrl,
          alt: imageData.desktop.alt,
          photographer_name: imageData.desktop.photographer_name,
        },
        mobile: {
          src: mobileImageUrl,
          alt: imageData.mobile.alt,
          photographer_name: imageData.mobile.photographer_name,
        },
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

    queryClient.invalidateQueries({
      queryKey: ["page_content", "page_images"],
    });

    toast({
      title: "Onnistui!",
      description: "Kuvat on päivitetty.",
    });
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
      <SingleImageUploader
        title="Etusivun pääkuva"
        description="Hallinnoi etusivun hero-kuvaa. Kuva näkyy etusivun yläosassa."
        imageKey="home_hero"
        currentData={pageImagesContent}
        onUpdate={handleImageUpdate}
        isUpdating={updatePageImagesMutation.isPending}
      />

      <SingleImageUploader
        title="Keikat-sivun pääkuva"
        description="Hallinnoi keikat-sivun hero-kuvaa. Kuva näkyy Keikat-sivun yläosassa."
        imageKey="keikat_hero"
        currentData={pageImagesContent}
        onUpdate={handleImageUpdate}
        isUpdating={updatePageImagesMutation.isPending}
        showPhotographerField={true}
      />

      <SingleImageUploader
        title="Galleria-sivun pääkuva"
        description="Hallinnoi galleria-sivun hero-kuvaa. Kuva näkyy Galleria-sivun yläosassa."
        imageKey="galleria_hero"
        currentData={pageImagesContent}
        onUpdate={handleImageUpdate}
        isUpdating={updatePageImagesMutation.isPending}
        showPhotographerField={true}
      />

      <DualImageUploader
        title="Bio-sivun pääkuva"
        description="Hallinnoi Bio-sivun hero-kuvia. Desktop- ja mobiilikuvat näkyvät eri näkymissä."
        imageKey="bio_hero"
        currentData={pageImagesContent}
        onUpdate={handleDualImageUpdate}
        isUpdating={updatePageImagesMutation.isPending}
      />

      {/* <DualImageUploader
        title="Bilebandi-sivun pääkuva"
        description="Hallinnoi Bilebandi-sivun hero-kuvia. Desktop- ja mobiilikuvat näkyvät eri näkymissä."
        imageKey="bilebandi_hero"
        currentData={pageImagesContent}
        onUpdate={handleDualImageUpdate}
        isUpdating={updatePageImagesMutation.isPending}
      /> */}
    </div>
  );
};

export default ImageManager;
