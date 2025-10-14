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
import { PageImage, PageImagesContent } from "@/types/content";
import { Loader2 } from "lucide-react";

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

interface SingleImageUploaderProps {
  title: string;
  description: string;
  imageKey: keyof PageImagesContent;
  currentData: PageImagesContent | undefined;
  onUpdate: (
    imageKey: keyof PageImagesContent,
    imageData: PageImage,
    imageFile: File
  ) => Promise<void>;
  isUpdating: boolean;
}

const SingleImageUploader = ({
  title,
  description,
  imageKey,
  currentData,
  onUpdate,
  isUpdating,
}: SingleImageUploaderProps) => {
  // Form setup
  const form = useForm<ImageFormValues>({
    resolver: zodResolver(imageFormSchema),
    defaultValues: {
      imageFile: undefined,
      alt: "",
    },
  });

  const onSubmit = async (data: ImageFormValues) => {
    await onUpdate(
      imageKey,
      {
        src: "", // Will be set by parent after upload
        alt: data.alt,
      },
      data.imageFile
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
      <CardContent className="flex gap-4">
        {/* Current Image Preview */}
        {currentImage && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Nykyinen kuva:</h4>
            <div className="relative w-64 h-64 border rounded-lg overflow-hidden">
              <img
                src={currentImage.src}
                alt={currentImage.alt}
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
                  {currentImage && (
                    <p className="text-sm text-accent">
                      Nykyinen alt-teksti:
                      <br />
                      {currentImage.alt}
                    </p>
                  )}
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

export default SingleImageUploader;
