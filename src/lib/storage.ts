import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';

export const uploadGigImage = async (file: File): Promise<string> => {
  if (!file) {
    throw new Error('No file provided for upload.');
  }

  const fileExtension = file.name.split('.').pop();
  const fileName = `${uuidv4()}.${fileExtension}`;
  const filePath = `public/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('gigs-images')
    .upload(filePath, file);

  if (uploadError) {
    throw new Error(`Image upload failed: ${uploadError.message}`);
  }

  const { data } = supabase.storage
    .from('gigs-images')
    .getPublicUrl(filePath);
    
  if (!data || !data.publicUrl) {
    throw new Error('Could not get public URL for the uploaded image.');
  }

  return data.publicUrl;
};
