import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import type { Json } from "@/integrations/supabase/types";
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
import { useToast } from "@/hooks/use-toast";
import { BioContent } from "@/types/content";
import { uploadCvPdf } from "@/lib/storage";

// Zod schema for validation
const bioFormSchema = z.object({
  introParagraphs: z
    .string()
    .min(10, { message: "Johdantoteksti on pakollinen." }),
  featuredVideoUrl: z
    .string()
    .url({ message: "Anna kelvollinen YouTube URL." })
    .optional()
    .or(z.literal("")),
  featuredVideoCaption: z.string().optional(),
  quoteText: z.string().min(10, { message: "Lainaus on pakollinen." }),
  quoteAuthor: z
    .string()
    .min(2, { message: "Lainauksen tekijä on pakollinen." }),
  concludingParagraphs: z
    .string()
    .min(10, { message: "Lopetusteksti on pakollinen." }),
  cv_file: z.instanceof(FileList).optional(),
});

type BioFormValues = z.infer<typeof bioFormSchema>;

// Default content for when no data exists
const defaultBioContent: BioContent = {
  introParagraphs:
    'Heidi Simelius on laulaja, lauluntekijä ja esiintyjä. Hän keikkailee esittäen omaa musiikkiaan ja julkaisi vuonna 2023 ensimmäisen EP:nsä Mä vastaan. Viiden biisin EP sisältää nimikkokappaleen lisäksi mm. kappaleet Missä sä oot? ja Meitä ei ole enää. Heidi on julkaissut aiemmin seitsemän singleä, mm. kappaleet Mun sydän on mun ja Upee. Heidin kappaleet ovat suomenkielisiä sekä vahvasti tekstilähtöisiä ja musiikki on tyyliltään soulahtavaa poppia.\n\nHeidi oli mukana Voice of Finlandin uusimmalla kaudella, jossa hän lauloi tiensä semifinaaliin. Heidi esiintyy vaihtelevasti myös erilaisten kokoonpanojen kanssa ja hänet on voitu nähdä mm. Suomen varusmiessoittokunnan "80\'s kiertueen" ja Gospel Helsinki -kuoron vierailevana solistina sekä keikoilla Pekka Simojoen kanssa.',
  featuredVideoUrl:
    "https://www.youtube.com/embed/3iOHoeFv4ZE?si=Y0dJ3DzDAxWcbrjD",
  featuredVideoCaption:
    "Tässä esitin Knockout-vaiheessa Jennifer Rushin kappaleen The Power Of Love!",
  quoteText:
    "Olen The Voice of Finland -ohjelman musiikkituottaja ja minulla oli ilo tehdä kaudella 2023-24 Heidi Simeliuksen kanssa useita musiikkinumeroita harjoituksineen ja suunnitteluineen. Tällä yli 6kk periodilla minulle on muodostunut Heidistä hyvin määrätietoinen, eteenpäin pyrkivä ja oman tiensä poikkkeuksellisen hyvin näkevä artisti, jonka musikaalisuus on ilmeistä. Suosittelen ja kannustan lämpimästi Heidiä oman musan tekemiseen ja esilletuomiseen joten tsekatkaa tää tyyppi❤️",
  quoteAuthor: "Lenni-Kalle Taipale",
  concludingParagraphs:
    "Heidi on valmistunut Tampereen Ammattikorkeakoulussa musiikkiteatterin ammattilaiskesi vuonna 2023 sekä Metropolia Ammattikorkeakoulusta muusikoksi esiintyjä-linjalta pääaineenaan pop/jazz-laulu vuonna 2019.\n\nKaudella 2023 – 2024 Heidi nähtiin Lahden Kaupunginteatterin Tootsie-musikaalissa. Kaudella 2022 – 2023 hän ihastutti Porin Teatterin Evita-musikaalissa Rakastajattaren roolissa. Tulevalla kaudella 2025 Heidi nähdään Oulun teatterin Kinky Boots -musikaalissa. Heidi tekee nimeä myös musikaali-suomentajana ja hänen ensimmäinen kokonaan suomentamansa musikaali Laillisesti Blondi nähtiin Sellosalissa keväällä 2022.",
};

const fetchBioContent = async (): Promise<BioContent> => {
  const { data, error } = await supabase
    .from("page_content")
    .select("content")
    .eq("page_name", "bio")
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // No data found, return default content
      return defaultBioContent;
    }
    throw new Error(error.message);
  }

  return data.content as unknown as BioContent;
};

const BioManager = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<BioFormValues>({
    resolver: zodResolver(bioFormSchema),
    defaultValues: defaultBioContent,
  });

  const {
    data: bioContent,
    isLoading,
    error,
  } = useQuery<BioContent>({
    queryKey: ["bio-content"],
    queryFn: fetchBioContent,
  });

  // Update form when data is loaded
  useEffect(() => {
    if (bioContent) {
      form.reset({
        introParagraphs: bioContent.introParagraphs,
        featuredVideoUrl: bioContent.featuredVideoUrl,
        featuredVideoCaption: bioContent.featuredVideoCaption,
        quoteText: bioContent.quoteText,
        quoteAuthor: bioContent.quoteAuthor,
        concludingParagraphs: bioContent.concludingParagraphs,
      });
    }
  }, [bioContent, form]);

  const mutation = useMutation({
    mutationFn: async (content: BioContent) => {
      const { error } = await supabase.from("page_content").upsert({
        page_name: "bio",
        content: content as unknown as Json,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Onnistui!",
        description: "Bion sisältö tallennettu onnistuneesti.",
      });
      queryClient.invalidateQueries({ queryKey: ["bio-content"] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Virhe",
        description: `Bion sisällön tallentaminen epäonnistui: ${error.message}`,
      });
    },
  });

  const onSubmit = async (data: BioFormValues) => {
    let cvUrl = bioContent?.cvUrl;

    // Handle CV upload if a new file is provided
    if (data.cv_file && data.cv_file.length > 0) {
      try {
        cvUrl = await uploadCvPdf(data.cv_file[0]);
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Virhe",
          description: `CV:n lataaminen epäonnistui: ${
            error instanceof Error ? error.message : "Tuntematon virhe"
          }`,
        });
        return;
      }
    }

    const updatedBioContent: BioContent = {
      introParagraphs: data.introParagraphs,
      featuredVideoUrl: data.featuredVideoUrl || "",
      featuredVideoCaption: data.featuredVideoCaption || "",
      quoteText: data.quoteText,
      quoteAuthor: data.quoteAuthor,
      concludingParagraphs: data.concludingParagraphs,
      cvUrl: cvUrl,
    };
    mutation.mutate(updatedBioContent);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Ladataan bion sisältöä...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-destructive">
          Virhe bion sisällön lataamisessa: {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[800px] mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Bion sisällön hallinta</h2>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
          {/* Introductory Text Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Johdantoteksti</h3>
            <FormField
              name="introParagraphs"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Johdantokappaleet <span className="text-secondary">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Kirjoita johdantokappaleet tähän..."
                      className="min-h-[200px] placeholder:text-muted-foreground"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Featured Video Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Esittelyvideo</h3>
            <div className="grid grid-cols-1 gap-4">
              <FormField
                name="featuredVideoUrl"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>YouTube URL</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://www.youtube.com/embed/..."
                        className="placeholder:text-muted-foreground"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name="featuredVideoCaption"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Videokuvaus</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Videokuvaus..."
                        className="placeholder:text-muted-foreground"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Featured Quote Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Esittelylaina</h3>
            <div className="space-y-4">
              <FormField
                name="quoteText"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Lainaus <span className="text-secondary">*</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Kirjoita lainaus tähän..."
                        className="min-h-[150px] placeholder:text-muted-foreground"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name="quoteAuthor"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Lainauksen tekijä{" "}
                      <span className="text-secondary">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Lainauksen tekijä..."
                        className="placeholder:text-muted-foreground"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Concluding Text Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Lopetusteksti</h3>
            <FormField
              name="concludingParagraphs"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Lopetuskappaleet <span className="text-secondary">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Kirjoita lopetuskappaleet tähän..."
                      className="min-h-[200px] placeholder:text-muted-foreground"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* CV Management Section */}
          <fieldset className="space-y-4">
            <h3 className="text-lg font-semibold">CV-hallinta</h3>

            {/* Current CV Display */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Nykyinen CV:</label>
              {bioContent?.cvUrl ? (
                <div className="flex items-center space-x-2">
                  <a
                    href={bioContent.cvUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    CV-Simelius-Heidi.pdf
                  </a>
                  <span className="text-sm text-muted-foreground">
                    (avautuu uudessa välilehdessä)
                  </span>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  CV:tä ei ole vielä ladattu.
                </p>
              )}
            </div>

            {/* CV Upload Field */}
            <FormField
              name="cv_file"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lataa uusi CV (PDF)</FormLabel>
                  <FormControl>
                    <Input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => field.onChange(e.target.files)}
                      className="cursor-pointer"
                    />
                  </FormControl>
                  <p className="text-sm text-muted-foreground">
                    Uuden CV:n lataaminen korvaa nykyisen CV:n.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
          </fieldset>

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Tallennetaan..." : "Tallenna muutokset"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default BioManager;
