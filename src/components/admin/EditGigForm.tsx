import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { format } from 'date-fns';
import { fi } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';
import { uploadGigImage } from '@/lib/storage';
import { Gig } from './GigsManager';

const editGigFormSchema = z.object({
  title: z.string().min(2, { message: 'Otsikko on pakollinen.' }),
  venue: z.string().min(2, { message: 'Paikka on pakollinen.' }),
  image_file: z.instanceof(FileList).optional(),
  image_alt: z.string().min(10, { message: 'Kuvateksti on pakollinen ja kuvaileva.' }),
  description: z.string().min(10, { message: 'Kuvaus on pakollinen.' }),
  event_page_url: z.string().url({ message: 'Anna kelvollinen URL.' }).optional().or(z.literal('')),
  tickets_url: z.string().url({ message: 'Anna kelvollinen URL.' }).optional().or(z.literal('')),
  organizer_name: z.string().optional(),
  organizer_url: z.string().url({ message: 'Anna kelvollinen URL.' }).optional().or(z.literal('')),
  address_locality: z.string().min(2, { message: 'Kaupunki on pakollinen.' }),
  address_country: z.string().min(2, { message: 'Maan koodi on pakollinen (esim. FI).' }),
  gig_type: z.enum(['Musiikki', 'Teatteri']),
  performance_date: z.date({ required_error: 'Päivämäärä on pakollinen.' }),
  performance_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'Anna aika muodossa HH:MM.' }),
});

type EditGigFormValues = z.infer<typeof editGigFormSchema>;

interface EditGigFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  gig: Gig | null;
}

const EditGigForm = ({ isOpen, onOpenChange, gig }: EditGigFormProps) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const form = useForm<EditGigFormValues>({ resolver: zodResolver(editGigFormSchema) });
  const imageFileRef = form.register('image_file');

  useEffect(() => {
    if (gig) {
      form.reset({
        ...gig,
        performance_date: new Date(gig.performance_date),
        performance_time: format(new Date(gig.performance_date), 'HH:mm'),
        image_file: undefined,
      });
    }
  }, [gig, form]);

  const mutation = useMutation({
    mutationFn: async (updatedGig: Partial<Gig>) => {
      if (!gig) throw new Error('No gig selected for update.');
      const { error } = await supabase.from('gigs').update(updatedGig).eq('id', gig.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Onnistui!', description: 'Keikan tiedot päivitetty.' });
      queryClient.invalidateQueries({ queryKey: ['gigs'] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: 'Virhe', description: `Päivitys epäonnistui: ${error.message}` });
    },
  });

  const onSubmit = async (data: EditGigFormValues) => {
    try {
      let imageUrl = gig?.image_url;

      const imageFile = data.image_file?.[0];
      if (imageFile) {
        imageUrl = await uploadGigImage(imageFile);
      }

      const performanceDate = new Date(data.performance_date);
      const [hours, minutes] = data.performance_time.split(':').map(Number);
      performanceDate.setHours(hours, minutes);

      const updatedGigData = {
        ...data,
        image_url: imageUrl,
        performance_date: performanceDate.toISOString(),
      };
      
      delete updatedGigData.image_file;
      delete updatedGigData.performance_time;

      mutation.mutate(updatedGigData);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Virhe prosessissa', description: error.message });
    }
  };

  if (!gig) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Muokkaa keikkaa</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField name="title" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Otsikko</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField name="venue" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Paikka</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormItem>
                <FormLabel>Vaihda kuva (valinnainen)</FormLabel>
                <FormControl><Input type="file" accept="image/png, image/jpeg, image/webp" {...imageFileRef} /></FormControl>
                <FormMessage />
              </FormItem>
              <FormField name="image_alt" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Kuvan Alt-teksti</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField name="description" control={form.control} render={({ field }) => ( <FormItem className="md:col-span-2"><FormLabel>Kuvaus</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField name="event_page_url" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Tapahtuman sivu (URL)</FormLabel><FormControl><Input placeholder="https://" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField name="tickets_url" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Lippulinkki (URL)</FormLabel><FormControl><Input placeholder="https://" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField name="organizer_name" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Järjestäjä</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField name="organizer_url" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Järjestäjän sivu (URL)</FormLabel><FormControl><Input placeholder="https://" {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField name="address_locality" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Kaupunki</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField name="address_country" control={form.control} render={({ field }) => ( <FormItem><FormLabel>Maan koodi</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="gig_type" render={({ field }) => ( <FormItem><FormLabel>Keikan tyyppi</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Valitse tyyppi" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Musiikki">Musiikki</SelectItem><SelectItem value="Teatteri">Teatteri</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} />
            </div>
            <div>
              <FormLabel>Esityspäivä ja -aika</FormLabel>
              <div className="flex items-center gap-2 p-3 border rounded-md mt-2">
                <FormField control={form.control} name="performance_date" render={({ field }) => (
                  <FormItem className="flex-1">
                    <Popover>
                      <PopoverTrigger asChild><FormControl><Button variant="outline" className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, 'd.M.yyyy') : <span>Valitse päivä</span>}</Button></FormControl></PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} locale={fi} initialFocus /></PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="performance_time" render={({ field }) => (
                  <FormItem><FormControl><Input className="w-[100px]" placeholder="HH:MM" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Peruuta</Button>
              <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Päivitetään...' : 'Tallenna muutokset'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
export default EditGigForm;
