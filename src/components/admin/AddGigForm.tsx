import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { v4 as uuidv4 } from "uuid";
import { useEffect } from "react";
import { format } from "date-fns";
import { fi } from "date-fns/locale";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { CalendarIcon, ExternalLink, PlusCircle, Trash2 } from "lucide-react";
import { uploadGigImage } from "@/lib/storage";
import { Gig, GigInsert } from "./GigsManager";

// Zod schema for validation
const gigFormSchema = z.object({
  title: z.string().min(2, { message: "Otsikko on pakollinen." }),
  venue: z.string().min(2, { message: "Paikka on pakollinen." }),
  image_file: z.instanceof(FileList).optional(),
  image_alt: z
    .string()
    .min(10, { message: "Kuvateksti on pakollinen ja kuvaileva." }),
  description: z.string().min(10, { message: "Kuvaus on pakollinen." }),
  event_page_url: z
    .string()
    .url({ message: "Anna kelvollinen URL." })
    .optional()
    .or(z.literal("")),
  tickets_url: z
    .string()
    .url({ message: "Anna kelvollinen URL." })
    .optional()
    .or(z.literal("")),
  organizer_name: z.string().optional(),
  organizer_url: z
    .string()
    .url({ message: "Anna kelvollinen URL." })
    .optional()
    .or(z.literal("")),
  address_locality: z.string().min(2, { message: "Kaupunki on pakollinen." }),
  gig_type: z.enum(["Musiikki", "Teatteri"]),
  performances: z
    .array(
      z.object({
        date: z.date({ required_error: "Päivämäärä on pakollinen." }),
        time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, {
          message: "Anna aika muodossa HH:MM.",
        }),
      })
    )
    .min(1, { message: "Lisää vähintään yksi esityspäivä." }),
});

type GigFormValues = z.infer<typeof gigFormSchema>;

interface AddGigFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess: () => void;
  gigToCopy: Gig | null;
}

const AddGigForm = ({
  isOpen,
  onOpenChange,
  onSuccess,
  gigToCopy,
}: AddGigFormProps) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const form = useForm<GigFormValues>({ resolver: zodResolver(gigFormSchema) });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "performances",
  });

  const imageFileRef = form.register("image_file");

  useEffect(() => {
    if (gigToCopy) {
      form.reset({
        ...gigToCopy,
        performances: [{ date: new Date(), time: "19:00" }],
      });
    } else {
      form.reset({
        title: "",
        venue: "",
        image_alt: "",
        description: "",
        event_page_url: "",
        tickets_url: "",
        organizer_name: "",
        organizer_url: "",
        address_locality: "",
        gig_type: "Musiikki",
        performances: [{ date: new Date(), time: "19:00" }],
      });
    }
  }, [gigToCopy, form]);

  const mutation = useMutation({
    mutationFn: async (gigsToInsert: GigInsert[]) => {
      const { error } = await supabase.from("gigs").insert(gigsToInsert);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Onnistui!",
        description: "Uudet keikat lisätty onnistuneesti.",
      });
      queryClient.invalidateQueries({ queryKey: ["gigs"] });
      onSuccess();
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Virhe",
        description: `Keikkojen lisääminen epäonnistui: ${error.message}`,
      });
    },
  });

  const onSubmit = async (data: GigFormValues) => {
    try {
      let imageUrl = gigToCopy?.image_url;
      const imageFile = data.image_file?.[0];

      if (imageFile) {
        imageUrl = await uploadGigImage(imageFile);
      }

      if (!imageUrl) {
        throw new Error(
          "Kuva on pakollinen. Lisää uusi kuva tai kopioi olemassaolevasta keikasta."
        );
      }

      const gigGroupId = uuidv4();
      const gigsToInsert: GigInsert[] = data.performances.map((performance) => {
        const performanceDate = new Date(performance.date);
        const [hours, minutes] = performance.time.split(":").map(Number);
        performanceDate.setHours(hours, minutes);

        const gigData: GigInsert = {
          title: data.title,
          venue: data.venue,
          image_url: imageUrl,
          image_alt: data.image_alt,
          description: data.description,
          event_page_url: data.event_page_url || null,
          tickets_url: data.tickets_url || null,
          organizer_name: data.organizer_name || null,
          organizer_url: data.organizer_url || null,
          address_locality: data.address_locality,
          address_country: "FI",
          gig_type: data.gig_type,
          gig_group_id: gigGroupId,
          performance_date: performanceDate.toISOString(),
        };

        return gigData;
      });
      mutation.mutate(gigsToInsert);
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Virhe prosessissa",
        description:
          error instanceof Error ? error.message : "Tuntematon virhe",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {gigToCopy ? "Kopioi keikka" : "Lisää uusi keikka"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6 p-1"
          >
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
                name="venue"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Paikka <span className="text-secondary">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Paikka"
                        className="placeholder:text-accent"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name="address_locality"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Kaupunki <span className="text-secondary">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Kaupunki"
                        className="placeholder:text-accent"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="gig_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Keikan tyyppi <span className="text-secondary">*</span>
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder="Valitse tyyppi"
                            className="placeholder:text-accent"
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Musiikki">Musiikki</SelectItem>
                        <SelectItem value="Teatteri">Teatteri</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormItem>
                <FormLabel>
                  {gigToCopy ? (
                    "Vaihda kuva"
                  ) : (
                    <>
                      Kuva <span className="text-secondary">*</span>
                    </>
                  )}
                </FormLabel>
                {gigToCopy?.image_url && (
                  <div className="mt-2">
                    <p className="text-sm text-accent mb-2">Nykyinen kuva:</p>
                    <img
                      src={gigToCopy.image_url}
                      alt="Nykyinen keikkakuva"
                      className="w-32 h-auto rounded-md border"
                    />
                  </div>
                )}
                <FormControl>
                  <Input
                    type="file"
                    accept="image/png, image/jpeg, image/webp"
                    {...imageFileRef}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
              <FormField
                name="image_alt"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Kuvan alt-teksti <span className="text-secondary">*</span>
                      <a
                        href="https://docs.google.com/document/d/1eK76knLEhmWHDbD1ZuX5hAG41491lWokbmA83YkAzo0/edit?usp=drive_link"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex text-accent"
                      >
                        Ohje alt-tekstin luontiin{" "}
                        <ExternalLink className="ml-1 w-4 h-4" />
                      </a>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Kuvan alt-teksti"
                        className="placeholder:text-accent h-[150px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name="description"
                control={form.control}
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>
                      Kuvaus <span className="text-secondary">*</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Kuvaus"
                        className="placeholder:text-accent"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div>
                <FormLabel>
                  Esityspäivät ja -ajat{" "}
                  <span className="text-secondary">*</span>
                </FormLabel>
                <FormMessage>
                  {form.formState.errors.performances?.root?.message}
                </FormMessage>
                <div className="space-y-3 mt-2">
                  {fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="flex items-center gap-2 p-3 border rounded-md"
                    >
                      <FormField
                        control={form.control}
                        name={`performances.${index}.date`}
                        render={({ field }) => (
                          <FormItem className="w-fit">
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      "w-fit pl-3 text-left font-normal",
                                      !field.value && "text-muted-foreground"
                                    )}
                                  >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {field.value ? (
                                      format(field.value, "d.M.yyyy")
                                    ) : (
                                      <span>Valitse päivä</span>
                                    )}
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent
                                className="w-auto p-0"
                                align="start"
                              >
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  locale={fi}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`performances.${index}.time`}
                        render={({ field }) => {
                          const handleTimeChange = (
                            e: React.ChangeEvent<HTMLInputElement>
                          ) => {
                            let value = e.target.value;

                            // Only allow numeric digits
                            value = value.replace(/[^0-9]/g, "");

                            // Limit to 4 digits maximum
                            if (value.length > 4) {
                              value = value.slice(0, 4);
                            }

                            // Auto-add colon after 2 digits
                            if (value.length >= 2) {
                              value = value.slice(0, 2) + ":" + value.slice(2);
                            }

                            // Validate hour range
                            if (value.length >= 2) {
                              const hour = parseInt(value.slice(0, 2));
                              if (hour > 23) {
                                value =
                                  "23" +
                                  (value.length > 2
                                    ? ":" + value.slice(3)
                                    : "");
                              }
                            }

                            // Validate minute range - first digit cannot be > 5
                            if (value.length > 3) {
                              const minuteFirstDigit = parseInt(
                                value.slice(3, 4),
                                10
                              );
                              if (minuteFirstDigit > 5) {
                                value =
                                  value.slice(0, 3) + "5" + value.slice(4);
                              }
                            }

                            field.onChange(value);
                          };

                          const handleTimeBlur = (
                            e: React.FocusEvent<HTMLInputElement>
                          ) => {
                            let value = e.target.value;

                            // Auto-pad minutes if only hour is provided
                            if (value.match(/^\d{1,2}:?$/)) {
                              const hour = value.replace(":", "");
                              if (hour.length <= 2) {
                                value = hour.padStart(2, "0") + ":00";
                              }
                            }

                            field.onChange(value);
                            field.onBlur();
                          };

                          const handleTimeKeyDown = (
                            e: React.KeyboardEvent<HTMLInputElement>
                          ) => {
                            // Clear entire field on backspace when not empty
                            if (
                              e.key === "Backspace" &&
                              field.value &&
                              field.value.length > 0
                            ) {
                              e.preventDefault();
                              field.onChange("");
                            }
                          };

                          return (
                            <FormItem>
                              <FormControl>
                                <Input
                                  className="w-[100px]"
                                  placeholder="HH:MM"
                                  value={field.value}
                                  onChange={handleTimeChange}
                                  onBlur={handleTimeBlur}
                                  onKeyDown={handleTimeKeyDown}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          );
                        }}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => append({ date: new Date(), time: "19:00" })}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Lisää uusi esityspäivä
                </Button>
              </div>
              <FormField
                name="event_page_url"
                control={form.control}
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Tapahtuman sivu (URL)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Tapahtuman sivu (URL)"
                        className="placeholder:text-accent"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name="tickets_url"
                control={form.control}
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Lippulinkki (URL)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Lippulinkki (URL)"
                        className="placeholder:text-accent"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name="organizer_name"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Järjestäjä</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Järjestäjä"
                        className="placeholder:text-accent"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                name="organizer_url"
                control={form.control}
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Järjestäjän sivu (URL)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Järjestäjän sivu (URL)"
                        className="placeholder:text-accent"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
              >
                Peruuta
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending
                  ? "Tallennetaan..."
                  : gigToCopy
                  ? "Luo kopio"
                  : "Tallenna"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddGigForm;
