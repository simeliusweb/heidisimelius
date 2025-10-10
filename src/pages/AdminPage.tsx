import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const AdminPage = () => {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-4xl font-bold mb-8">Content Management</h1>
      <Tabs defaultValue="gigs" className="w-full">
        <TabsList>
          <TabsTrigger value="gigs">Gigs</TabsTrigger>
          <TabsTrigger value="photo_sets">Photo Sets</TabsTrigger>
          <TabsTrigger value="videos">Videos</TabsTrigger>
          <TabsTrigger value="page_content">Page Content</TabsTrigger>
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
