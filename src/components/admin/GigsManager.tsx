import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import { format } from 'date-fns';
import AddGigForm from './AddGigForm';

export type Gig = {
  id: string;
  created_at: string;
  title: string;
  venue: string;
  performance_date: string;
};

const fetchGigs = async (): Promise<Gig[]> => {
  const { data, error } = await supabase
    .from('gigs')
    .select('id, created_at, title, venue, performance_date')
    .order('performance_date', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
};

const GigsManager = () => {
  const [isAddGigOpen, setIsAddGigOpen] = useState(false);
  const { data: gigs, isLoading, error } = useQuery<Gig[]>({ queryKey: ['gigs'], queryFn: fetchGigs });

  if (isLoading) return <div>Ladataan keikkoja...</div>;
  if (error) return <div>Virhe haettaessa keikkoja: {error.message}</div>;

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setIsAddGigOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Lisää uusi keikka
        </Button>
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
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Avaa valikko</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Muokkaa</DropdownMenuItem>
                        <DropdownMenuItem>Kopioi</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">Poista</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">Ei keikkoja löytynyt.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <AddGigForm isOpen={isAddGigOpen} onOpenChange={setIsAddGigOpen} onSuccess={() => setIsAddGigOpen(false)} />
    </div>
  );
};

export default GigsManager;
