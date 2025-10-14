import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { ResponsivePageImage, PageImagesContent } from "@/types/content";
import { Loader2 } from "lucide-react";

// Zod schema for validation
const dualImageFormSchema = z.object({
  desktopImageFile: z
    .instanceof(File, { message: "Desktop-kuva on pakollinen." })
    .refine((file) => file.size > 0, { message: "Desktop-kuva on pakollinen." })
    .refine(
      (file) =>
        ["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(
          file.type
        ),
      { message: "Tuetut tiedostotyypit: JPG, PNG, WEBP." }
    ),
  desktopAlt: z
    .string()
    .min(1, { message: "Desktop alt-teksti on pakollinen." }),
  mobileImageFile: z
    .instanceof(File, { message: "Mobiilikuva on pakollinen." })
    .refine((file) => file.size > 0, { message: "Mobiilikuva on pakollinen." })
    .refine(
      (file) =>
        ["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(
          file.type
        ),
      { message: "Tuetut tiedostotyypit: JPG, PNG, WEBP." }
    ),
  mobileAlt: z
    .string()
    .min(1, { message: "Mobiili alt-teksti on pakollinen." }),
});

type DualImageFormValues = z.infer<typeof dualImageFormSchema>;

interface DualImageUploaderProps {
  title: string;
  description: string;
  imageKey: keyof Pick<PageImagesContent, "bio_hero" | "bilebandi_hero">;
  currentData: PageImagesContent | undefined;
  onUpdate: (
    imageKey: keyof Pick<PageImagesContent, "bio_hero" | "bilebandi_hero">,
    imageData: ResponsivePageImage,
    desktopFile: File,
    mobileFile: File
  ) => Promise<void>;
  isUpdating: boolean;
}

const DualImageUploader = ({
  title,
  description,
  imageKey,
  currentData,
  onUpdate,
  isUpdating,
}: DualImageUploaderProps) => {
  // Form setup
  const form = useForm<DualImageFormValues>({
    resolver: zodResolver(dualImageFormSchema),
    defaultValues: {
      desktopImageFile: undefined,
      desktopAlt: "",
      mobileImageFile: undefined,
      mobileAlt: "",
    },
  });

  const onSubmit = async (data: DualImageFormValues) => {
    await onUpdate(
      imageKey,
      {
        desktop: {
          src: "", // Will be set by parent after upload
          alt: data.desktopAlt,
        },
        mobile: {
          src: "", // Will be set by parent after upload
          alt: data.mobileAlt,
        },
      },
      data.desktopImageFile,
      data.mobileImageFile
    );
  };

  const currentImage = currentData?.[imageKey];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription className="text-foreground">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Images Preview */}
        {currentImage && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Nykyinen desktop-kuva:</h4>
              <div className="relative w-full h-48 border rounded-lg overflow-hidden">
                <img
                  src={currentImage.desktop.src}
                  alt={currentImage.desktop.alt}
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-sm text-accent">
                Nykyinen alt-teksti:
                <br />
                {currentImage.desktop.alt}
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Nykyinen mobiilikuva:</h4>
              <div className="relative w-full h-48 border rounded-lg overflow-hidden">
                <img
                  src={currentImage.mobile.src}
                  alt={currentImage.mobile.alt}
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-sm text-accent">
                Nykyinen alt-teksti:
                <br />
                {currentImage.mobile.alt}
              </p>
            </div>
          </div>
        )}

        {/* Update Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Desktop Image Section */}
            <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
              <h4 className="text-lg font-medium">Desktop-kuva</h4>

              <FormField
                control={form.control}
                name="desktopImageFile"
                render={({ field: { onChange, value, ...field } }) => (
                  <FormItem>
                    <FormLabel>
                      Uusi desktop-kuva{" "}
                      <span className="text-secondary">*</span>
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
                name="desktopAlt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Desktop alt-teksti (ei näy käyttäjille){" "}
                      <span className="text-secondary">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="placeholder:text-accent"
                        placeholder="Kuvaile desktop-kuvaa"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Mobile Image Section */}
            <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
              <h4 className="text-lg font-medium">Mobiilikuva</h4>

              <FormField
                control={form.control}
                name="mobileImageFile"
                render={({ field: { onChange, value, ...field } }) => (
                  <FormItem>
                    <FormLabel>
                      Uusi mobiilikuva <span className="text-secondary">*</span>
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
                name="mobileAlt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Mobiili alt-teksti (ei näy käyttäjille){" "}
                      <span className="text-secondary">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="placeholder:text-accent"
                        placeholder="Kuvaile mobiilikuvaa"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button
              type="submit"
              disabled={isUpdating}
              className="flex w-fit ml-auto"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Päivitetään...
                </>
              ) : (
                `Päivitä ${title.toLowerCase()}`
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default DualImageUploader;
