import { useForm, useFieldArray } from "react-hook-form";
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
import { BioContent, Credit, StudioItem } from "@/types/content";
import { uploadCvPdf } from "@/lib/storage";
import { v4 as uuidv4 } from "uuid";
import { Trash2, PlusCircle } from "lucide-react";
import { getYouTubeEmbedUrl } from "@/lib/utils";

// Zod schema for validation
const bioFormSchema = z.object({
  introParagraphs: z
    .string()
    .min(10, { message: "Johdantoteksti on pakollinen." }),
  featuredVideoUrl: z
    .string()
    .trim()
    .min(1, { message: "YouTube-URL on pakollinen." })
    .refine((val) => getYouTubeEmbedUrl(val) !== undefined, {
      message:
        "Anna kelvollinen YouTube-video-URL (esim. youtube.com/watch?v=ID tai youtu.be/ID).",
    })
    .transform((val) => getYouTubeEmbedUrl(val) || ""),
  featuredVideoCaption: z.string().optional(),
  quoteText: z.string().min(10, { message: "Lainaus on pakollinen." }),
  quoteAuthor: z
    .string()
    .min(2, { message: "Lainauksen tekijä on pakollinen." }),
  concludingParagraphs: z
    .string()
    .min(10, { message: "Lopetusteksti on pakollinen." }),
  cv_file: z.instanceof(FileList).optional(),
  theatreCredits: z
    .array(
      z.object({
        id: z.string(),
        year: z.number().min(1900).max(2100),
        title: z.string().min(1, "Otsikko on pakollinen."),
        details: z.string().min(1, "Tiedot ovat pakollisia."),
      })
    )
    .optional(),
  translationCredits: z
    .array(
      z.object({
        id: z.string(),
        year: z.number().min(1900).max(2100),
        title: z.string().min(1, "Otsikko on pakollinen."),
        details: z.string().min(1, "Tiedot ovat pakollisia."),
      })
    )
    .optional(),
  soloAlbums: z
    .array(
      z.object({
        id: z.string(),
        title: z.string().min(1, "Otsikko on pakollinen."),
        subtitle: z.string().optional(),
        artistOrCollaborator: z.string().min(1, "Artisti on pakollinen."),
        year: z.number().min(1900).max(2100),
      })
    )
    .optional(),
  singles: z
    .array(
      z.object({
        id: z.string(),
        title: z.string().min(1, "Otsikko on pakollinen."),
        artistOrCollaborator: z.string().min(1, "Artisti on pakollinen."),
        year: z.number().min(1900).max(2100),
      })
    )
    .optional(),
  collaborations: z
    .array(
      z.object({
        id: z.string(),
        title: z.string().min(1, "Otsikko on pakollinen."),
        artistOrCollaborator: z
          .string()
          .min(1, "Yhteistyökumppani on pakollinen."),
        year: z.number().min(1900).max(2100),
      })
    )
    .optional(),
});

type BioFormValues = z.infer<typeof bioFormSchema>;

// Default content for when no data exists
const defaultBioContent: BioContent = {
  introParagraphs:
    'Heidi Simelius on laulaja, lauluntekijä ja esiintyjä. Hän keikkailee esittäen omaa musiikkiaan ja julkaisi vuonna 2023 ensimmäisen EP:nsä Mä vastaan. Viiden biisin EP sisältää nimikkokappaleen lisäksi mm. kappaleet Missä sä oot? ja Meitä ei ole enää. Heidi on julkaissut aiemmin seitsemän singleä, mm. kappaleet Mun sydän on mun ja Upee. Heidin kappaleet ovat suomenkielisiä sekä vahvasti tekstilähtöisiä ja musiikki on tyyliltään soulahtavaa poppia.\n\nHeidi oli mukana Voice of Finlandin uusimmalla kaudella, jossa hän lauloi tiensä semifinaaliin. Heidi esiintyy vaihtelevasti myös erilaisten kokoonpanojen kanssa ja hänet on voitu nähdä mm. Suomen varusmiessoittokunnan "80\'s kiertueen" ja Gospel Helsinki -kuoron vierailevana solistina sekä keikoilla Pekka Simojoen kanssa.',
  featuredVideoUrl: "https://www.youtube.com/embed/3iOHoeFv4ZE",
  featuredVideoCaption:
    "Tässä esitin Knockout-vaiheessa Jennifer Rushin kappaleen The Power Of Love!",
  quoteText:
    "Olen The Voice of Finland -ohjelman musiikkituottaja ja minulla oli ilo tehdä kaudella 2023-24 Heidi Simeliuksen kanssa useita musiikkinumeroita harjoituksineen ja suunnitteluineen. Tällä yli 6kk periodilla minulle on muodostunut Heidistä hyvin määrätietoinen, eteenpäin pyrkivä ja oman tiensä poikkkeuksellisen hyvin näkevä artisti, jonka musikaalisuus on ilmeistä. Suosittelen ja kannustan lämpimästi Heidiä oman musan tekemiseen ja esilletuomiseen joten tsekatkaa tää tyyppi❤️",
  quoteAuthor: "Lenni-Kalle Taipale",
  concludingParagraphs:
    "Heidi on valmistunut Tampereen Ammattikorkeakoulussa musiikkiteatterin ammattilaiskesi vuonna 2023 sekä Metropolia Ammattikorkeakoulusta muusikoksi esiintyjä-linjalta pääaineenaan pop/jazz-laulu vuonna 2019.\n\nKaudella 2023 – 2024 Heidi nähtiin Lahden Kaupunginteatterin Tootsie-musikaalissa. Kaudella 2022 – 2023 hän ihastutti Porin Teatterin Evita-musikaalissa Rakastajattaren roolissa. Tulevalla kaudella 2025 Heidi nähdään Oulun teatterin Kinky Boots -musikaalissa. Heidi tekee nimeä myös musikaali-suomentajana ja hänen ensimmäinen kokonaan suomentamansa musikaali Laillisesti Blondi nähtiin Sellosalissa keväällä 2022.",
  theatreCredits: [],
  translationCredits: [],
  soloAlbums: [],
  singles: [],
  collaborations: [],
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

  // useFieldArray hooks for dynamic lists
  const {
    fields: theatreFields,
    append: appendTheatre,
    remove: removeTheatre,
  } = useFieldArray({ control: form.control, name: "theatreCredits" });
  const {
    fields: translationFields,
    append: appendTranslation,
    remove: removeTranslation,
  } = useFieldArray({ control: form.control, name: "translationCredits" });
  const {
    fields: soloAlbumFields,
    append: appendSoloAlbum,
    remove: removeSoloAlbum,
  } = useFieldArray({ control: form.control, name: "soloAlbums" });
  const {
    fields: singleFields,
    append: appendSingle,
    remove: removeSingle,
  } = useFieldArray({ control: form.control, name: "singles" });
  const {
    fields: collaborationFields,
    append: appendCollaboration,
    remove: removeCollaboration,
  } = useFieldArray({ control: form.control, name: "collaborations" });

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
        theatreCredits: bioContent.theatreCredits || [],
        translationCredits: bioContent.translationCredits || [],
        soloAlbums: bioContent.soloAlbums || [],
        singles: bioContent.singles || [],
        collaborations: bioContent.collaborations || [],
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
      featuredVideoUrl: data.featuredVideoUrl,
      featuredVideoCaption: data.featuredVideoCaption || "",
      quoteText: data.quoteText,
      quoteAuthor: data.quoteAuthor,
      concludingParagraphs: data.concludingParagraphs,
      cvUrl: cvUrl,
      theatreCredits: (data.theatreCredits || []).filter(
        (credit): credit is Credit =>
          credit.id !== undefined &&
          credit.title !== undefined &&
          credit.year !== undefined &&
          credit.details !== undefined
      ),
      translationCredits: (data.translationCredits || []).filter(
        (credit): credit is Credit =>
          credit.id !== undefined &&
          credit.title !== undefined &&
          credit.year !== undefined &&
          credit.details !== undefined
      ),
      soloAlbums: (data.soloAlbums || []).filter(
        (item): item is StudioItem =>
          item.id !== undefined &&
          item.title !== undefined &&
          item.year !== undefined &&
          item.artistOrCollaborator !== undefined
      ),
      singles: (data.singles || []).filter(
        (item): item is StudioItem =>
          item.id !== undefined &&
          item.title !== undefined &&
          item.year !== undefined &&
          item.artistOrCollaborator !== undefined
      ),
      collaborations: (data.collaborations || []).filter(
        (item): item is StudioItem =>
          item.id !== undefined &&
          item.title !== undefined &&
          item.year !== undefined &&
          item.artistOrCollaborator !== undefined
      ),
    };
    mutation.mutate(updatedBioContent);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-accent">Ladataan bion sisältöä...</div>
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
                      className="min-h-[200px] placeholder:text-accent"
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
                    <p className="text-sm text-accent">
                      Muotoa:
                      <br />
                      https://www.youtube.com/watch?v=...
                      <br />
                      https://youtu.be/...
                    </p>
                    <FormControl>
                      <Input
                        placeholder="URL-osoite"
                        className="placeholder:text-accent"
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
                        className="placeholder:text-accent"
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
                        className="min-h-[150px] placeholder:text-accent"
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
                        className="placeholder:text-accent"
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
                      className="min-h-[200px] placeholder:text-accent"
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
                    className="text-secondary hover:underline"
                  >
                    CV-Simelius-Heidi.pdf
                  </a>
                  <span className="text-sm text-accent">
                    (avautuu uudessa välilehdessä)
                  </span>
                </div>
              ) : (
                <p className="text-sm text-foreground">
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
                  <p className="text-sm text-accent">
                    Uuden CV:n lataaminen korvaa nykyisen CV:n.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
          </fieldset>

          {/* Theatre Credits Section */}
          <fieldset className="space-y-4">
            <h3 className="text-lg font-semibold">Teatteri</h3>
            {theatreFields.map((field, index) => (
              <div
                key={field.id}
                className="flex gap-4 p-4 border rounded-lg relative"
              >
                <FormField
                  name={`theatreCredits.${index}.year`}
                  control={form.control}
                  render={({ field }) => (
                    <FormItem className="w-[80px]">
                      <FormLabel>
                        Vuosi <span className="text-secondary">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          className="placeholder:text-accent"
                          placeholder="2023"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name={`theatreCredits.${index}.title`}
                  control={form.control}
                  render={({ field }) => (
                    <FormItem className="w-[300px]">
                      <FormLabel>
                        Otsikko <span className="text-secondary">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Kinky Boots"
                          {...field}
                          className="placeholder:text-accent"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name={`theatreCredits.${index}.details`}
                  control={form.control}
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>
                        Tiedot <span className="text-secondary">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          className="placeholder:text-accent"
                          placeholder="Oulun teatteri | Ensemble / Nicola Us"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeTheatre(index)}
                  className="absolute top-2 right-2"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                appendTheatre({
                  id: uuidv4(),
                  year: new Date().getFullYear(),
                  title: "",
                  details: "",
                })
              }
              className="w-fit"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Lisää teatterikrediitti
            </Button>
          </fieldset>

          {/* Translation Credits Section */}
          <fieldset className="space-y-4">
            <h3 className="text-lg font-semibold">Suomennokset</h3>
            {translationFields.map((field, index) => (
              <div
                key={field.id}
                className="flex gap-4 p-4 border rounded-lg relative"
              >
                <FormField
                  name={`translationCredits.${index}.year`}
                  control={form.control}
                  render={({ field }) => (
                    <FormItem className="w-[80px]">
                      <FormLabel>
                        Vuosi <span className="text-secondary">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          className="placeholder:text-accent"
                          placeholder="2021"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name={`translationCredits.${index}.title`}
                  control={form.control}
                  render={({ field }) => (
                    <FormItem className="w-[300px]">
                      <FormLabel>
                        Otsikko <span className="text-secondary">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          className="placeholder:text-accent"
                          placeholder="Legally Blonde / Laillisesti Blondi"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name={`translationCredits.${index}.details`}
                  control={form.control}
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>
                        Tiedot <span className="text-secondary">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          className="placeholder:text-accent"
                          placeholder="Musiikkiopisto Juvenalia"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeTranslation(index)}
                  className="absolute top-2 right-2"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                appendTranslation({
                  id: uuidv4(),
                  year: new Date().getFullYear(),
                  title: "",
                  details: "",
                })
              }
              className="w-fit"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Lisää suomennoskrediitti
            </Button>
          </fieldset>

          {/* Solo Albums Section */}
          <fieldset className="space-y-4">
            <h3 className="text-lg font-semibold">Sooloalbumit</h3>
            {soloAlbumFields.map((field, index) => (
              <div
                key={field.id}
                className="flex gap-4 p-4 border rounded-lg relative"
              >
                <FormField
                  name={`soloAlbums.${index}.year`}
                  control={form.control}
                  render={({ field }) => (
                    <FormItem className="w-[80px]">
                      <FormLabel>
                        Vuosi <span className="text-secondary">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          className="placeholder:text-accent"
                          placeholder="2023"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name={`soloAlbums.${index}.title`}
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Otsikko <span className="text-secondary">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          className="placeholder:text-accent"
                          placeholder="Mä vastaan EP"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name={`soloAlbums.${index}.artistOrCollaborator`}
                  control={form.control}
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>
                        Artisti <span className="text-secondary">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          className="placeholder:text-accent"
                          placeholder="Heidi Simelius"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name={`soloAlbums.${index}.subtitle`}
                  control={form.control}
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Alaotsikko</FormLabel>
                      <FormControl>
                        <Input
                          className="placeholder:text-accent"
                          placeholder="(singlet Meitä ei ole enää ja Missä sä oot?)"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeSoloAlbum(index)}
                  className="absolute top-2 right-2"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                appendSoloAlbum({
                  id: uuidv4(),
                  title: "",
                  subtitle: "",
                  artistOrCollaborator: "Heidi Simelius",
                  year: new Date().getFullYear(),
                })
              }
              className="w-fit"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Lisää sooloalbumi
            </Button>
          </fieldset>

          {/* Singles Section */}
          <fieldset className="space-y-4">
            <h3 className="text-lg font-semibold">Singlet</h3>
            {singleFields.map((field, index) => (
              <div
                key={field.id}
                className="flex gap-4 p-4 border rounded-lg relative"
              >
                <FormField
                  name={`singles.${index}.year`}
                  control={form.control}
                  render={({ field }) => (
                    <FormItem className="w-[80px]">
                      <FormLabel>
                        Vuosi <span className="text-secondary">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          className="placeholder:text-accent"
                          placeholder="2021"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name={`singles.${index}.title`}
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Otsikko <span className="text-secondary">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          className="placeholder:text-accent"
                          placeholder="Mun sydän on mun"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name={`singles.${index}.artistOrCollaborator`}
                  control={form.control}
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>
                        Artisti <span className="text-secondary">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          className="placeholder:text-accent"
                          placeholder="Heidi Simelius"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeSingle(index)}
                  className="absolute top-2 right-2"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                appendSingle({
                  id: uuidv4(),
                  title: "",
                  artistOrCollaborator: "Heidi Simelius",
                  year: new Date().getFullYear(),
                })
              }
              className="w-fit"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Lisää single
            </Button>
          </fieldset>

          {/* Collaborations Section */}
          <fieldset className="space-y-4">
            <h3 className="text-lg font-semibold">Yhteistyöt</h3>
            {collaborationFields.map((field, index) => (
              <div
                key={field.id}
                className="flex gap-4 p-4 border rounded-lg relative"
              >
                <FormField
                  name={`collaborations.${index}.year`}
                  control={form.control}
                  render={({ field }) => (
                    <FormItem className="w-[80px]">
                      <FormLabel>
                        Vuosi <span className="text-secondary">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          className="placeholder:text-accent"
                          placeholder="2022"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name={`collaborations.${index}.title`}
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Otsikko <span className="text-secondary">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          className="placeholder:text-accent"
                          placeholder="Rautalanka-autot"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name={`collaborations.${index}.artistOrCollaborator`}
                  control={form.control}
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>
                        Yhteistyökumppani{" "}
                        <span className="text-secondary">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          className="placeholder:text-accent"
                          placeholder="Pekka Simojoki"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeCollaboration(index)}
                  className="absolute top-2 right-2"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                appendCollaboration({
                  id: uuidv4(),
                  title: "",
                  artistOrCollaborator: "",
                  year: new Date().getFullYear(),
                })
              }
              className="w-fit"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Lisää yhteistyö
            </Button>
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
