import React from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const AdminPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        variant: "destructive",
        title: "Ongelma uloskirjautumisessa, voit sulkea selaimen :)",
        description: error.message,
      });
    } else {
      toast({ title: "Kirjauduit ulos." });
      navigate("/login");
    }
  };

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Sisällön hallinta</h1>
        <Button variant="outline" onClick={handleSignOut}>
          Kirjaudu ulos
        </Button>
      </div>
      <Tabs defaultValue="gigs" className="w-full">
        <TabsList>
          <TabsTrigger value="gigs">Keikat</TabsTrigger>
          <TabsTrigger value="photo_sets">Galleria</TabsTrigger>
          <TabsTrigger value="videos">Videot</TabsTrigger>
          <TabsTrigger value="page_content">Bio</TabsTrigger>
        </TabsList>
        <TabsContent value="gigs" className="mt-4">
          <p>The form for managing gigs will be here.</p>
        </TabsContent>
        <TabsContent value="photo_sets" className="mt-4">
          <p>The form for managing photo sets will be here.</p>
        </TabsContent>
        <TabsContent value="videos" className="mt-4">
          <p>The form for managing videos will be here.</p>
        </TabsContent>
        <TabsContent value="page_content" className="mt-4">
          <p>The form for managing general page content will be here.</p>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPage;
