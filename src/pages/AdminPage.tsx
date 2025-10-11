import React from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import GigsManager from "@/components/admin/GigsManager";

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
      <Tabs defaultValue="keikat" className="w-full">
        <TabsList>
          <TabsTrigger value="keikat">Keikat</TabsTrigger>
          <TabsTrigger value="galleria">Galleria</TabsTrigger>
          <TabsTrigger value="videot">Videot</TabsTrigger>
          <TabsTrigger value="bio">Bio</TabsTrigger>
        </TabsList>
        <TabsContent value="keikat" className="mt-4">
          <GigsManager />
        </TabsContent>
        <TabsContent value="galleria" className="mt-4">
          <p>Gallerian sisällön hallinta tulee tähän.</p>
        </TabsContent>
        <TabsContent value="videot" className="mt-4">
           <p>Videoiden sisällön hallinta tulee tähän.</p>
        </TabsContent>
        <TabsContent value="bio" className="mt-4">
          <p>Bion sisällön hallinta tulee tähän.</p>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPage;
