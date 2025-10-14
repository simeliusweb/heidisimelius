import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";

export const uploadGigImage = async (file: File): Promise<string> => {
  if (!file) {
    throw new Error("No file provided for upload.");
  }

  const fileExtension = file.name.split(".").pop();
  const fileName = `${uuidv4()}.${fileExtension}`;
  const filePath = `public/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("gigs-images")
    .upload(filePath, file);

  if (uploadError) {
    throw new Error(`Image upload failed: ${uploadError.message}`);
  }

  const { data } = supabase.storage.from("gigs-images").getPublicUrl(filePath);

  if (!data || !data.publicUrl) {
    throw new Error("Could not get public URL for the uploaded image.");
  }

  return data.publicUrl;
};

export const uploadPhotoSetImage = async (
  file: File,
  onUploadProgress?: (progress: number) => void
): Promise<string> => {
  if (!file) {
    throw new Error("No file provided for upload.");
  }

  const fileExtension = file.name.split(".").pop();
  const fileName = `${uuidv4()}.${fileExtension}`;
  const filePath = `public/${fileName}`;

  // Simulate progress for better UX since Supabase doesn't provide progress callbacks
  if (onUploadProgress) {
    onUploadProgress(10);
    await new Promise((resolve) => setTimeout(resolve, 100));
    onUploadProgress(50);
    await new Promise((resolve) => setTimeout(resolve, 100));
    onUploadProgress(90);
  }

  const { error: uploadError } = await supabase.storage
    .from("photo_sets_images")
    .upload(filePath, file);

  if (uploadError) {
    throw new Error(`Image upload failed: ${uploadError.message}`);
  }

  if (onUploadProgress) {
    onUploadProgress(100);
  }

  const { data } = supabase.storage
    .from("photo_sets_images")
    .getPublicUrl(filePath);

  if (!data || !data.publicUrl) {
    throw new Error("Could not get public URL for the uploaded image.");
  }

  return data.publicUrl;
};

export const uploadPressKitZip = async (
  file: File,
  onUploadProgress?: (progress: number) => void
): Promise<string> => {
  if (!file) {
    throw new Error("No file provided for upload.");
  }

  const fileExtension = file.name.split(".").pop();
  const fileName = `${uuidv4()}.${fileExtension}`;
  const filePath = `public/${fileName}`;

  // Simulate progress for better UX since Supabase doesn't provide progress callbacks
  if (onUploadProgress) {
    onUploadProgress(10);
    await new Promise((resolve) => setTimeout(resolve, 100));
    onUploadProgress(50);
    await new Promise((resolve) => setTimeout(resolve, 100));
    onUploadProgress(90);
  }

  const { error: uploadError } = await supabase.storage
    .from("photo_sets_images")
    .upload(filePath, file);

  if (uploadError) {
    throw new Error(`Zip upload failed: ${uploadError.message}`);
  }

  if (onUploadProgress) {
    onUploadProgress(100);
  }

  const { data } = supabase.storage
    .from("photo_sets_images")
    .getPublicUrl(filePath);

  if (!data || !data.publicUrl) {
    throw new Error("Could not get public URL for the uploaded zip file.");
  }

  return data.publicUrl;
};

export const uploadCvPdf = async (file: File): Promise<string> => {
  if (!file) {
    throw new Error("No file provided for upload.");
  }

  const filePath = "cv/CV-Simelius-Heidi.pdf";

  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(filePath, file, {
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`CV upload failed: ${uploadError.message}`);
  }

  const { data } = supabase.storage.from("documents").getPublicUrl(filePath);

  if (!data || !data.publicUrl) {
    throw new Error("Could not get public URL for the uploaded CV.");
  }

  return data.publicUrl;
};

export const uploadBioImage = async (file: File): Promise<string> => {
  if (!file) {
    throw new Error("No file provided for upload.");
  }

  const fileExt = file.name.split(".").pop();
  const fileName = `${uuidv4()}.${fileExt}`;
  const filePath = `bio_images/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("images")
    .upload(filePath, file);

  if (uploadError) {
    throw new Error(`Bio image upload failed: ${uploadError.message}`);
  }

  const { data } = supabase.storage.from("images").getPublicUrl(filePath);

  if (!data || !data.publicUrl) {
    throw new Error("Could not get public URL for the uploaded bio image.");
  }

  return data.publicUrl;
};

export const uploadPageImage = async (file: File): Promise<string> => {
  if (!file) {
    throw new Error("No file provided for upload.");
  }

  const fileExt = file.name.split(".").pop();
  const fileName = `${uuidv4()}.${fileExt}`;
  const filePath = `page-images/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("images")
    .upload(filePath, file);

  if (uploadError) {
    throw new Error(`Page image upload failed: ${uploadError.message}`);
  }

  const { data } = supabase.storage.from("images").getPublicUrl(filePath);

  if (!data || !data.publicUrl) {
    throw new Error("Could not get public URL for the uploaded page image.");
  }

  return data.publicUrl;
};
