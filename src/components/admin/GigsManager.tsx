import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import AddGigForm from './AddGigForm';
import EditGigForm from './EditGigForm';

export type Gig = {
  id: string; created_at: string; title: string; venue: string; image_url: string; image_alt: string;
  description: string; event_page_url?: string; tickets_url?: string; gig_type: 'Musiikki' | 'Teatteri';
  performance_date: string; organizer_name?: string; organizer_url?: string; address_locality: string;
  address_country: string; gig_group_id?: string;
};

const fetchGigs = async (): Promise<Gig[]> => {
  const { data, error } = await supabase.from('gigs').select('*').order('performance_date', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
};

const GigsManager = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const [selectedGig, setSelectedGig] = useState<Gig | null>(null);
  const [gigToCopy, setGigToCopy] = useState<Gig | null>(null);
  const [gigToDelete, setGigToDelete] = useState<Gig | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: gigs, isLoading, error } = useQuery<Gig[]>({ queryKey: ['gigs'], queryFn: fetchGigs });

  const deleteMutation = useMutation({
    mutationFn: async (gigId: string) => {
      const { error } = await supabase.from('gigs').delete().eq('id', gigId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Onnistui!', description: 'Keikka poistettu onnistuneesti.' });
      queryClient.invalidateQueries({ queryKey: ['gigs'] });
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: 'Virhe', description: `Keikan poistaminen epäonnistui: ${error.message}` });
    },
    onSettled: () => {
      setIsDeleteDialogOpen(false);
      setGigToDelete(null);
    }
  });

  const handleEditClick = (gig: Gig) => {
    setSelectedGig(gig);
    setIsEditDialogOpen(true);
  };

  const handleCopyClick = (gig: Gig) => {
    setGigToCopy(gig);
    setIsAddDialogOpen(true);
  };
  
  const handleAddNewClick = () => {
    setGigToCopy(null);
    setIsAddDialogOpen(true);
  };

  const handleDeleteClick = (gig: Gig) => {
    setGigToDelete(gig);
    setIsDeleteDialogOpen(true);
  };

  if (isLoading) return <div>Ladataan keikkoja...</div>;
  if (error) return <div>Virhe haettaessa keikkoja: {error.message}</div>;

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={handleAddNewClick}><PlusCircle className="mr-2 h-4 w-4" />Lisää uusi keikka</Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Otsikko</TableHead>
              <TableHead>Paikka</TableHead>
              <TableHead>Päivämäärä</TableHead>
              <TableHead className="text-right">Toiminnot</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {gigs && gigs.length > 0 ? (
              gigs.map((gig) => (
                <TableRow key={gig.id}>
                  <TableCell className="font-medium">{gig.title}</TableCell>
                  <TableCell>{gig.venue}</TableCell>
                  <TableCell>{format(new Date(gig.performance_date), 'dd.MM.yyyy HH:mm')}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">Avaa valikko</span><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditClick(gig)}>Muokkaa</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleCopyClick(gig)}>Kopioi</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onSelect={() => handleDeleteClick(gig)}>Poista</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan={4} className="h-24 text-center">Ei keikkoja löytynyt.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      <AddGigForm isOpen={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} onSuccess={() => setIsAddDialogOpen(false)} gigToCopy={gigToCopy} />
      <EditGigForm isOpen={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} gig={selectedGig} />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Oletko täysin varma?</AlertDialogTitle>
            <AlertDialogDescription>
              Tämä toiminto poistaa keikan '{gigToDelete?.title}' päivämäärällä {gigToDelete ? format(new Date(gigToDelete.performance_date), 'd.M.yyyy') : ''} pysyvästi. Toimintoa ei voi perua.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Peruuta</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if(gigToDelete) {
                  deleteMutation.mutate(gigToDelete.id);
                }
              }}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Poistetaan...' : 'Kyllä, poista'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
export default GigsManager;