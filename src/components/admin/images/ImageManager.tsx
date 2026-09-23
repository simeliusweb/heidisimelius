import { supabase } from "@/integrations/supabase/client";
import { assertRowsChanged } from "@/lib/dbWrite";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  PageImagesContent,
  PageImage,
  ResponsivePageImage,
} from "@/types/content";
import { uploadPageImage } from "@/lib/storage";
import LoadingSpinner from "@/components/LoadingSpinner";
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

  // Which image is being uploaded; every update button is disabled meanwhile, so a
  // double click can't upload twice or overwrite the other image's change.
  const [pendingKey, setPendingKey] = useState<keyof PageImagesContent | null>(
    null
  );

  // Upload the file(s), merge into the page_images document and save it. Errors end up
  // in a toast instead of being swallowed by the form.
  const savePageImages = async (
    imageKey: keyof PageImagesContent,
    buildContent: () => Promise<PageImagesContent>,
    successText: string
  ) => {
    setPendingKey(imageKey);
    try {
      const updatedContent = await buildContent();

      const { data: changedRows, error } = await supabase
        .from("page_content")
        .upsert({
          page_name: "page_images",
          content: updatedContent as unknown as Json,
          updated_at: new Date().toISOString(),
        })
        .select("page_name");
      if (error) throw new Error(error.message);
      assertRowsChanged(changedRows);

      queryClient.invalidateQueries({
        queryKey: ["page_content", "page_images"],
      });
      toast({ title: "Onnistui!", description: successText });
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Virhe",
        description: `Kuvan päivitys epäonnistui: ${
          error instanceof Error ? error.message : "Tuntematon virhe"
        }`,
      });
    } finally {
      setPendingKey(null);
    }
  };

  const handleImageUpdate = (
    imageKey: keyof PageImagesContent,
    imageData: PageImage,
    imageFile: File
  ) =>
    savePageImages(
      imageKey,
      async () => ({
        ...pageImagesContent,
        [imageKey]: {
          src: await uploadPageImage(imageFile),
          alt: imageData.alt,
          photographer_name: imageData.photographer_name,
        },
      }),
      "Kuva on päivitetty."
    );

  const handleDualImageUpdate = (
    imageKey: keyof Pick<PageImagesContent, "bio_hero" | "bilebandi_hero">,
    imageData: ResponsivePageImage,
    desktopFile: File,
    mobileFile: File
  ) =>
    savePageImages(
      imageKey,
      async () => {
        const desktopImageUrl = await uploadPageImage(desktopFile);
        const mobileImageUrl = await uploadPageImage(mobileFile);
        return {
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
      },
      "Kuvat on päivitetty."
    );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner />
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
        isUpdating={pendingKey !== null}
      />

      <SingleImageUploader
        title="Keikat-sivun pääkuva"
        description="Hallinnoi keikat-sivun hero-kuvaa. Kuva näkyy Keikat-sivun yläosassa."
        imageKey="keikat_hero"
        currentData={pageImagesContent}
        onUpdate={handleImageUpdate}
        isUpdating={pendingKey !== null}
        showPhotographerField={true}
      />

      <SingleImageUploader
        title="Galleria-sivun pääkuva"
        description="Hallinnoi galleria-sivun hero-kuvaa. Kuva näkyy Galleria-sivun yläosassa."
        imageKey="galleria_hero"
        currentData={pageImagesContent}
        onUpdate={handleImageUpdate}
        isUpdating={pendingKey !== null}
        showPhotographerField={true}
      />

      <DualImageUploader
        title="Bio-sivun pääkuva"
        description="Hallinnoi Bio-sivun hero-kuvia. Desktop- ja mobiilikuvat näkyvät eri näkymissä."
        imageKey="bio_hero"
        currentData={pageImagesContent}
        onUpdate={handleDualImageUpdate}
        isUpdating={pendingKey !== null}
      />

      {/* <DualImageUploader
        title="Bilebandi-sivun pääkuva"
        description="Hallinnoi Bilebandi-sivun hero-kuvia. Desktop- ja mobiilikuvat näkyvät eri näkymissä."
        imageKey="bilebandi_hero"
        currentData={pageImagesContent}
        onUpdate={handleDualImageUpdate}
        isUpdating={pendingKey !== null}
      /> */}
    </div>
  );
};

export default ImageManager;
