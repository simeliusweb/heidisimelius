import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
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
import {
  LaulunopetusContent,
  PricingTier,
  SchoolInfoLink,
  Testimonial,
} from "@/types/content";
import { v4 as uuidv4 } from "uuid";
import { Trash2, PlusCircle, Star, Eye, EyeOff } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";

const optionalUrl = z
  .string()
  .trim()
  .url({ message: "Syötä kelvollinen osoite (esim. https://...)" })
  .or(z.literal(""))
  .optional();

const laulunopetusFormSchema = z.object({
  tagline: z.string().min(1, { message: "Tagline on pakollinen." }),
  introLeadParagraph: z
    .string()
    .min(10, { message: "Johdantoteksti on pakollinen." }),
  introBodyParagraphs: z
    .string()
    .min(10, { message: "Leipäteksti on pakollinen." }),
  practiceItems: z
    .array(z.object({ value: z.string().min(1, "Kohta ei voi olla tyhjä.") }))
    .min(1, { message: "Lisää vähintään yksi harjoittelukohta." }),
  ctaButtonText: z.string().min(1, { message: "CTA-teksti on pakollinen." }),
  ctaButtonUrl: optionalUrl,
  testimonials: z
    .array(
      z.object({
        id: z.string(),
        text: z.string().min(1, "Lainaus on pakollinen."),
        author: z.string().min(1, "Nimi on pakollinen."),
      }),
    )
    .optional(),
  pricingVisible: z.boolean(),
  pricingTitle: z
    .string()
    .min(1, { message: "Hinnaston otsikko on pakollinen." }),
  pricingTiers: z.array(
    z.object({
      id: z.string(),
      name: z.string().min(1, "Nimi on pakollinen."),
      price: z.string().min(1, "Hinta on pakollinen."),
      duration: z.string().min(1, "Kesto on pakollinen."),
      isFeatured: z.boolean().optional(),
    }),
  ),
  schoolInfoVisible: z.boolean(),
  schoolInfoTitle: z.string().optional(),
  schoolInfoText: z.string().optional(),
  schoolInfoLinks: z
    .array(
      z.object({
        id: z.string(),
        label: z.string().min(1, "Linkin teksti on pakollinen."),
        url: z
          .string()
          .trim()
          .url({ message: "Syötä kelvollinen osoite (esim. https://...)" }),
      }),
    )
    .optional(),
  backgroundTitle: z
    .string()
    .min(1, { message: "Tausta-osion otsikko on pakollinen." }),
  backgroundParagraphs: z
    .string()
    .min(10, { message: "Tausta-osion teksti on pakollinen." }),
  closingCta: z
    .string()
    .min(1, { message: "Loppukehotus on pakollinen." }),
  finalCtaButtonText: z
    .string()
    .min(1, { message: "Lopun CTA-teksti on pakollinen." }),
  finalCtaButtonUrl: optionalUrl,
  heroImageCredit: z.string().min(1, { message: "Kuvaajan nimi on pakollinen." }),
}).superRefine((data, ctx) => {
  // Tiers are only required while the pricing section is actually shown, so the
  // section can be hidden (and left empty) without blocking saves.
  if (data.pricingVisible && data.pricingTiers.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["pricingTiers"],
      message: "Lisää vähintään yksi hintataso tai piilota hinnasto.",
    });
  }
});

type LaulunopetusFormValues = z.infer<typeof laulunopetusFormSchema>;

const defaultContent: LaulunopetusContent = {
  tagline: "Laulunopettaja Tampereen laulukoululla",
  introLeadParagraph:
    "Etsitkö laadukasta laulunopetusta Tampereella? Haluaisitko varmuutta tekniikkaan, tulkita suuria tunteita tai laulaa korkealta ja kovaa?",
  introBodyParagraphs:
    "Tarjoan yksilöllistä laulunopetusta Tampereen laulukoululla Hämeenpuistossa. Erityisosaamistani on rytmimusiikki, musikaalikappaleiden vocal coaching ja esiintymisvalmennus.\n\nLaulunopettajana haluan luoda positiivisen pedagogian keinoin rennon ja luovan oppimisilmapiirin, jossa on helppo heittäytyä ja kokeilla uutta. Tunneillani saa olla oma itsensä ja lähdemme liikkeelle jokaisen oppilaan omista lähtökohdista, vahvuuksista ja tavoitteista.\n\nVoit tulla laulutunneille aloittelijana tai jo pidempään laulua harrastaneena tai ammattilaisena!",
  practiceItems: [
    "laulutekniikkaa ja äänen fysiologiaa",
    "tulkintaa ja tarinankerrontaa (ATS eli Acting Through Song)",
    "pääsykoekappaleita musiikkialan hakuihin",
    "esiintymisvarmuutta karaokelavoille tai keikoille",
  ],
  ctaButtonText: "Varaa tunti Tampereen laulukoulun sivuilta",
  // employee_id preselects Heidi in the laulukoulu booking flow, so the visitor
  // lands straight on her services instead of having to pick a teacher.
  ctaButtonUrl:
    "https://tampereenlaulukoulu.asioi.fi/ajanvaraus?language=fi&pob_id=1&employee_id=1449",
  testimonials: [
    {
      id: "testimonial-1",
      text: "Suosittelen lämpimästi Heidin laulutunteja. Olen ottanut pariin otteeseen 5x laulutuntipaketit, joiden aikana ehtii mainiosti treenata tekniikkaa, itse kappaletta ja vielä pohtia esiintymistäkin. Näihin kaikkiin osa-alueisiin Heidiltä saa rautaisen ammattitaitoista ohjausta/opetusta - tietenkin rennossa ja positiivisessa ilmapiirissä. Heidin laulutunnit sopivat sekä aloittelijoille että kokeneemmillekin laulajille 🩷🥰",
      author: "Annemari",
    },
    {
      id: "testimonial-2",
      text: "Menin Heidille ekalle laulutunnilleni ikinä ja oon maailman onnellisin et löysin hänet! Heidin kanssa oli tosi helppoa olla ihan alusta lähtien ja sain jo ekalla tunnilla tosi paljon vinkkejä laulamiseen ja tekniikkaan. Opin tosi kokonaisvaltasesti ihmisen äänestä, joka konkretisoi paljon niitä kysymysmerkkejä, joita mulla on laulamiseen liittyen ollut. Ostin heti 5 laulutuntia lisää, koska Heidi on super!",
      author: "Aino",
    },
  ],
  pricingVisible: false,
  pricingTitle: "Hinnat – Laulunopetus Tampere",
  schoolInfoVisible: true,
  schoolInfoTitle: "Hinnasto ja ajanvaraus",
  schoolInfoText:
    "Opetan Tampereen laulukoululla Hämeenpuistossa, joten laulutuntien hinnat ja ajanvaraus löytyvät laulukoulun sivuilta.\n\nVoit myös ottaa minuun suoraan yhteyttä sivun alaosasta löytyvällä lomakkeella, jos haluat kysyä lisää laulutunneista.",
  schoolInfoLinks: [
    {
      id: "school-link-1",
      label: "Hinnasto – Tampereen laulukoulu",
      url: "https://www.tampereenlaulukoulu.fi/hinnasto",
    },
    {
      id: "school-link-2",
      label: "Varaa aika",
      url: "https://tampereenlaulukoulu.asioi.fi/ajanvaraus?language=fi&pob_id=1&employee_id=1449",
    },
  ],
  pricingTiers: [
    {
      id: "tier-1",
      name: "Ensimmäinen kokeilutunti",
      price: "40€",
      duration: "45 min",
    },
    {
      id: "tier-2",
      name: "Yksittäiset tunnit",
      price: "60€",
      duration: "45 min",
    },
    {
      id: "tier-3",
      name: "Tuntipaketti",
      price: "280€",
      duration: "5 x 45 min",
      isFeatured: true,
    },
  ],
  backgroundTitle: "Taustani laulunopettajana",
  backgroundParagraphs:
    "Opiskelen tällä hetkellä pop/jazz-laulun pedagogiikkaa Metropolia ammattikorkeakoulussa. Laulunopettajana olen toiminut vuodesta 2016 ja opetan tällä hetkellä Tampereen laulukoululla. Aiemmin olen opettanut yksityisesti sekä sijaistanut mm. Pirkanmaan musiikkiopistossa ja Tampereenseudun työväenopistossa.\n\nAiemmat opiskeluvuoteni Metropolia ammattikorkeakoulun muusikko-opinnoissa esiintyjä-linjalta toivat minulle erikoisosaamista pop/jazz-laulun eri tyylisuunissa. Vahvuuksiini kuuluu soul ja rnb musiikin äänenkäyttötavat ja melismat. Minulla on kokemusta myös CVT ja Estill -laulutekniikoista.\n\nOpinnot Tampereen ammattikorkeakoulun Musiikkiteatteriopinnoissa toivat erikoisosaamista musikaalilaulun, eläytymisen ja tarinankerronnan parissa. Kokemusta on karttunut myös työskentelystä musikaaleissa.\n\nOlen keikkaillut laulajana yli kymmenen vuoden ajan niin solistina kuin taustalaulajanakin sekä toiminut myös studiolaulajana. Teen keikkaa ja omaa musiikkia myös artistina. Laulunopettajana ammennan tietotaitoa siis hyvin käytännönläheisesti monenlaisesta työkokemuksesta musiikin kentällä.",
  closingCta:
    "Laulaminen on minulle tapa ilmaista itseäni ja tulkita tunteita. Tule laulutunneille Tampereen laulukoululle kokemaan laulamisen iloa!",
  finalCtaButtonText: "Ota yhteyttä ja kysy lisää!",
  heroImageCredit: "Sanni Majamaa",
};

const fetchLaulunopetusContent =
  async (): Promise<LaulunopetusContent> => {
    const { data, error } = await supabase
      .from("page_content")
      .select("content")
      .eq("page_name", "laulunopetus")
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return defaultContent;
      }
      throw new Error(error.message);
    }

    return data.content as unknown as LaulunopetusContent;
  };

const LaulunopetusManager = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{
    type: string;
    index: number;
    title: string;
  } | null>(null);

  const form = useForm<LaulunopetusFormValues>({
    resolver: zodResolver(laulunopetusFormSchema),
    defaultValues: {
      ...defaultContent,
      practiceItems: defaultContent.practiceItems.map((item) => ({
        value: item,
      })),
      ctaButtonUrl: defaultContent.ctaButtonUrl ?? "",
      finalCtaButtonUrl: defaultContent.finalCtaButtonUrl ?? "",
      pricingVisible: defaultContent.pricingVisible ?? false,
      schoolInfoVisible: defaultContent.schoolInfoVisible ?? true,
      schoolInfoTitle: defaultContent.schoolInfoTitle ?? "",
      schoolInfoText: defaultContent.schoolInfoText ?? "",
      schoolInfoLinks: defaultContent.schoolInfoLinks ?? [],
    },
  });

  const {
    fields: practiceFields,
    append: appendPractice,
    remove: removePractice,
  } = useFieldArray({ control: form.control, name: "practiceItems" });

  const {
    fields: testimonialFields,
    append: appendTestimonial,
    remove: removeTestimonial,
  } = useFieldArray({ control: form.control, name: "testimonials" });

  const {
    fields: pricingFields,
    append: appendPricing,
    remove: removePricing,
  } = useFieldArray({ control: form.control, name: "pricingTiers" });

  const {
    fields: schoolLinkFields,
    append: appendSchoolLink,
    remove: removeSchoolLink,
  } = useFieldArray({ control: form.control, name: "schoolInfoLinks" });

  const pricingVisible = form.watch("pricingVisible");
  const schoolInfoVisible = form.watch("schoolInfoVisible");

  const {
    data: content,
    isLoading,
    error,
  } = useQuery<LaulunopetusContent>({
    queryKey: ["laulunopetus-content"],
    queryFn: fetchLaulunopetusContent,
  });

  useEffect(() => {
    if (content) {
      form.reset({
        tagline: content.tagline,
        introLeadParagraph: content.introLeadParagraph,
        introBodyParagraphs: content.introBodyParagraphs,
        practiceItems: (content.practiceItems || []).map((item) => ({
          value: item,
        })),
        ctaButtonText: content.ctaButtonText,
        ctaButtonUrl: content.ctaButtonUrl ?? "",
        testimonials: content.testimonials || [],
        pricingVisible: content.pricingVisible !== false,
        pricingTitle: content.pricingTitle,
        pricingTiers: content.pricingTiers || [],
        schoolInfoVisible: content.schoolInfoVisible !== false,
        schoolInfoTitle: content.schoolInfoTitle ?? "",
        schoolInfoText: content.schoolInfoText ?? "",
        schoolInfoLinks: content.schoolInfoLinks || [],
        backgroundTitle: content.backgroundTitle,
        backgroundParagraphs: content.backgroundParagraphs,
        closingCta: content.closingCta,
        finalCtaButtonText: content.finalCtaButtonText,
        finalCtaButtonUrl: content.finalCtaButtonUrl ?? "",
        heroImageCredit: content.heroImageCredit,
      });
    }
  }, [content, form]);

  const mutation = useMutation({
    mutationFn: async (updatedContent: LaulunopetusContent) => {
      const { error } = await supabase.from("page_content").upsert({
        page_name: "laulunopetus",
        content: updatedContent as unknown as Json,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Onnistui!",
        description: "Laulunopetuksen sisältö tallennettu onnistuneesti.",
      });
      queryClient.invalidateQueries({ queryKey: ["laulunopetus-content"] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Virhe",
        description: `Tallentaminen epäonnistui: ${error.message}`,
      });
    },
  });

  const onSubmit = (data: LaulunopetusFormValues) => {
    const updatedContent: LaulunopetusContent = {
      tagline: data.tagline,
      introLeadParagraph: data.introLeadParagraph,
      introBodyParagraphs: data.introBodyParagraphs,
      practiceItems: data.practiceItems.map((item) => item.value),
      ctaButtonText: data.ctaButtonText,
      ctaButtonUrl: data.ctaButtonUrl?.trim() || undefined,
      testimonials: (data.testimonials || []).filter(
        (t): t is Testimonial =>
          t.id !== undefined && t.text !== undefined && t.author !== undefined,
      ),
      pricingVisible: data.pricingVisible,
      pricingTitle: data.pricingTitle,
      pricingTiers: (data.pricingTiers || []).filter(
        (t): t is PricingTier =>
          t.id !== undefined &&
          t.name !== undefined &&
          t.price !== undefined &&
          t.duration !== undefined,
      ),
      schoolInfoVisible: data.schoolInfoVisible,
      schoolInfoTitle: data.schoolInfoTitle?.trim() || undefined,
      schoolInfoText: data.schoolInfoText?.trim() || undefined,
      schoolInfoLinks: (data.schoolInfoLinks || []).filter(
        (l): l is SchoolInfoLink =>
          l.id !== undefined && l.label !== undefined && l.url !== undefined,
      ),
      backgroundTitle: data.backgroundTitle,
      backgroundParagraphs: data.backgroundParagraphs,
      closingCta: data.closingCta,
      finalCtaButtonText: data.finalCtaButtonText,
      finalCtaButtonUrl: data.finalCtaButtonUrl?.trim() || undefined,
      heroImageCredit: data.heroImageCredit,
    };
    mutation.mutate(updatedContent);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-accent">
          Ladataan laulunopetuksen sisältöä...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-destructive">
          Virhe sisällön lataamisessa: {error.message}
        </div>
      </div>
    );
  }

  const handleDeleteClick = (type: string, index: number, title: string) => {
    setItemToDelete({ type, index, title });
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (itemToDelete) {
      switch (itemToDelete.type) {
        case "practiceItems":
          removePractice(itemToDelete.index);
          break;
        case "testimonials":
          removeTestimonial(itemToDelete.index);
          break;
        case "pricingTiers":
          removePricing(itemToDelete.index);
          break;
        case "schoolInfoLinks":
          removeSchoolLink(itemToDelete.index);
          break;
        default:
          break;
      }

      try {
        await form.handleSubmit(onSubmit)();
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Virhe",
          description: `Poistaminen epäonnistui: ${
            error instanceof Error ? error.message : "Tuntematon virhe"
          }`,
        });
      } finally {
        setIsDeleteDialogOpen(false);
        setItemToDelete(null);
      }
    }
  };

  return (
    <div className="space-y-6 max-w-[800px] mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">
          Laulunopetuksen sisällön hallinta
        </h2>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
          {/* Hero Image Credit */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-secondary">
              Hero-kuva
            </h3>
            <FormField
              name="heroImageCredit"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Kuvaajan nimi <span className="text-secondary">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Kuvaajan nimi..."
                      className="placeholder:text-accent"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Tagline */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-secondary">
              Tagline
            </h3>
            <FormField
              name="tagline"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Tagline <span className="text-secondary">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Tagline..."
                      className="placeholder:text-accent"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Intro Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-secondary">
              Johdanto
            </h3>
            <FormField
              name="introLeadParagraph"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Johdantokappale (korostettu){" "}
                    <span className="text-secondary">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Johdantokappale..."
                      className="min-h-[100px] placeholder:text-accent"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="introBodyParagraphs"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Leipäteksti (kappaleet erotetaan tyhjällä rivillä){" "}
                    <span className="text-secondary">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Leipäteksti..."
                      className="min-h-[200px] placeholder:text-accent"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Practice Items */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-secondary">
              Harjoittelukohteet
            </h3>
            <p className="text-sm text-accent">
              &quot;Laulutunneilla voimme harjoitella esim.&quot; -listan kohdat
            </p>
            {practiceFields.map((field, index) => (
              <div key={field.id} className="flex gap-2 items-start">
                <FormField
                  name={`practiceItems.${index}.value`}
                  control={form.control}
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input
                          placeholder="Harjoittelukohde..."
                          className="placeholder:text-accent"
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
                  onClick={() =>
                    handleDeleteClick(
                      "practiceItems",
                      index,
                      form.getValues(`practiceItems.${index}.value`),
                    )
                  }
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              className="mt-2"
              onClick={() => appendPractice({ value: "" })}
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Lisää harjoittelukohde
            </Button>
          </div>

          {/* CTA Button Text */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-secondary">
              CTA-painike
            </h3>
            <FormField
              name="ctaButtonText"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    CTA-painikkeen teksti{" "}
                    <span className="text-secondary">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Painikkeen teksti..."
                      className="placeholder:text-accent"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="ctaButtonUrl"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Painikkeen linkki (valinnainen)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://www.tampereenlaulukoulu.fi/hinnasto"
                      className="placeholder:text-accent"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <p className="text-sm text-accent">
                    Jos linkki on annettu, painike avaa sen uuteen välilehteen.
                    Jos kenttä on tyhjä, painike vie sivun alalaidan
                    yhteydenottolomakkeeseen.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Testimonials */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-secondary">
              Suositukset
            </h3>
            {testimonialFields.map((field, index) => (
              <div
                key={field.id}
                className="border border-border rounded-lg p-4 space-y-3"
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-accent">
                    Suositus {index + 1}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      handleDeleteClick(
                        "testimonials",
                        index,
                        form.getValues(`testimonials.${index}.author`),
                      )
                    }
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <FormField
                  name={`testimonials.${index}.text`}
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Lainaus <span className="text-secondary">*</span>
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Lainaus..."
                          className="min-h-[120px] placeholder:text-accent"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name={`testimonials.${index}.author`}
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Nimi <span className="text-secondary">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Nimi..."
                          className="placeholder:text-accent"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              className="mt-2"
              onClick={() =>
                appendTestimonial({ id: uuidv4(), text: "", author: "" })
              }
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Lisää suositus
            </Button>
          </div>

          {/* Tampereen laulukoulu info block */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-secondary">
              Laulukoulu-osio
            </h3>
            <p className="text-sm text-accent">
              Näytetään sivulla hinnaston paikalla. Tähän kannattaa laittaa
              linkit Tampereen laulukoulun hinnastoon ja ajanvaraukseen.
            </p>
            <FormField
              name="schoolInfoVisible"
              control={form.control}
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-2 space-y-0 rounded-lg border border-border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="flex items-center gap-1 cursor-pointer">
                    {field.value ? (
                      <Eye className="h-4 w-4 text-primary" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-accent" />
                    )}
                    Näytä laulukoulu-osio sivulla
                  </FormLabel>
                </FormItem>
              )}
            />
            {schoolInfoVisible && (
              <>
                <FormField
                  name="schoolInfoTitle"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Otsikko</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="esim. Hinnasto ja ajanvaraus"
                          className="placeholder:text-accent"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="schoolInfoText"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Teksti (kappaleet erotetaan tyhjällä rivillä)
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Teksti..."
                          className="min-h-[120px] placeholder:text-accent"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {schoolLinkFields.map((field, index) => (
                  <div
                    key={field.id}
                    className="border border-border rounded-lg p-4 space-y-3"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-accent">
                        Linkki {index + 1}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          handleDeleteClick(
                            "schoolInfoLinks",
                            index,
                            form.getValues(`schoolInfoLinks.${index}.label`),
                          )
                        }
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <FormField
                      name={`schoolInfoLinks.${index}.label`}
                      control={form.control}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Linkin teksti{" "}
                            <span className="text-secondary">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="esim. Hinnasto – Tampereen laulukoulu"
                              className="placeholder:text-accent"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      name={`schoolInfoLinks.${index}.url`}
                      control={form.control}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Osoite <span className="text-secondary">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="https://www.tampereenlaulukoulu.fi/hinnasto"
                              className="placeholder:text-accent"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  className="mt-2"
                  onClick={() =>
                    appendSchoolLink({ id: uuidv4(), label: "", url: "" })
                  }
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Lisää linkki
                </Button>
              </>
            )}
          </div>

          {/* Pricing Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-secondary">
              Hinnasto
            </h3>
            <FormField
              name="pricingVisible"
              control={form.control}
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-2 space-y-0 rounded-lg border border-border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="flex items-center gap-1 cursor-pointer">
                    {field.value ? (
                      <Eye className="h-4 w-4 text-primary" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-accent" />
                    )}
                    Näytä hinnasto sivulla
                  </FormLabel>
                </FormItem>
              )}
            />
            <p className="text-sm text-accent">
              {pricingVisible
                ? "Hinnasto näkyy sivulla."
                : "Hinnasto on piilotettu sivulta, mutta hintatasot säilyvät tallessa alla. Voit ottaa ne takaisin käyttöön milloin tahansa."}
            </p>
            <FormField
              name="pricingTitle"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Hinnaston otsikko{" "}
                    <span className="text-secondary">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Hinnaston otsikko..."
                      className="placeholder:text-accent"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {pricingFields.map((field, index) => (
              <div
                key={field.id}
                className="border border-border rounded-lg p-4 space-y-3"
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-accent">
                    Hintataso {index + 1}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      handleDeleteClick(
                        "pricingTiers",
                        index,
                        form.getValues(`pricingTiers.${index}.name`),
                      )
                    }
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <FormField
                  name={`pricingTiers.${index}.name`}
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Nimi <span className="text-secondary">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="esim. Yksittäiset tunnit"
                          className="placeholder:text-accent"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    name={`pricingTiers.${index}.price`}
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Hinta <span className="text-secondary">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="esim. 60€"
                            className="placeholder:text-accent"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    name={`pricingTiers.${index}.duration`}
                    control={form.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Kesto <span className="text-secondary">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="esim. 45 min"
                            className="placeholder:text-accent"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  name={`pricingTiers.${index}.isFeatured`}
                  control={form.control}
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="flex items-center gap-1 cursor-pointer">
                        <Star className="h-4 w-4 text-primary" />
                        Suosituin (korostettu)
                      </FormLabel>
                    </FormItem>
                  )}
                />
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              className="mt-2"
              onClick={() =>
                appendPricing({
                  id: uuidv4(),
                  name: "",
                  price: "",
                  duration: "",
                  isFeatured: false,
                })
              }
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Lisää hintataso
            </Button>
          </div>

          {/* Background Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-secondary">
              Tausta-osio
            </h3>
            <FormField
              name="backgroundTitle"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Otsikko <span className="text-secondary">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Otsikko..."
                      className="placeholder:text-accent"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="backgroundParagraphs"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Teksti (kappaleet erotetaan tyhjällä rivillä){" "}
                    <span className="text-secondary">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Tausta-osion teksti..."
                      className="min-h-[250px] placeholder:text-accent"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="closingCta"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Loppukehotus (korostettu teksti){" "}
                    <span className="text-secondary">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Loppukehotus..."
                      className="min-h-[80px] placeholder:text-accent"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Final CTA */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-secondary">
              Lopun CTA-painike
            </h3>
            <FormField
              name="finalCtaButtonText"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Painikkeen teksti{" "}
                    <span className="text-secondary">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Painikkeen teksti..."
                      className="placeholder:text-accent"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="finalCtaButtonUrl"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Painikkeen linkki (valinnainen)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Jätä tyhjäksi, jos painike vie yhteydenottolomakkeeseen"
                      className="placeholder:text-accent"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Submit Button */}
          <div className="sticky bottom-4 z-10 flex justify-center pt-4">
            <Button
              type="submit"
              size="lg"
              className="shadow-lg"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Tallennetaan..." : "Tallenna muutokset"}
            </Button>
          </div>
        </form>
      </Form>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Vahvista poistaminen</AlertDialogTitle>
            <AlertDialogDescription>
              Haluatko varmasti poistaa kohdan &quot;{itemToDelete?.title}
              &quot;? Tätä toimintoa ei voi peruuttaa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Peruuta</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Poista
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default LaulunopetusManager;
