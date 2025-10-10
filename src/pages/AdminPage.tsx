import React from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const AdminPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({ variant: 'destructive', title: 'Error signing out', description: error.message });
    } else {
      toast({ title: 'Signed out successfully.' });
      navigate('/login');
    }
  };

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Content Management</h1>
        <Button variant="outline" onClick={handleSignOut}>Sign Out</Button>
      </div>
      <Tabs defaultValue="gigs" className="w-full">
        <TabsList>
          <TabsTrigger value="gigs">Gigs</TabsTrigger>
          <TabsTrigger value="photo_sets">Photo Sets</TabsTrigger>
          <TabsTrigger value="videos">Videos</TabsTrigger>
          <TabsTrigger value="page_content">Page Content</TabsTrigger>
        </TabsList>
        <TabsContent value="gigs" className="mt-4"><p>The form for managing gigs will be here.</p></TabsContent>
        <TabsContent value="photo_sets" className="mt-4"><p>The form for managing photo sets will be here.</p></TabsContent>
        <TabsContent value="videos" className="mt-4"><p>The form for managing videos will be here.</p></TabsContent>
        <TabsContent value="page_content" className="mt-4"><p>The form for managing general page content will be here.</p></TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPage;
