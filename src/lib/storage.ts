import { supabase } from "@/integrations/supabase/client";

/**
 * Official storage buckets used in the Lourex app.
 */
export const STORAGE_BUCKETS = {
  PRODUCT_IMAGES: "product-images", // Primary bucket for request and product images
  DOCUMENTS: "documents",           // Bucket for official documents/PDFs
} as const;

/**
 * Semantic paths within buckets.
 */
export const STORAGE_PATHS = {
  PURCHASE_REQUESTS: (id: string) => `purchase-requests/${id}`,
  DEAL_ATTACHMENTS: (dealNumber: string) => `deal-attachments/${dealNumber}`,
} as const;

/**
 * Centralized upload helper to ensure consistent bucket and path usage.
 */
export const uploadFile = async (
  bucket: keyof typeof STORAGE_BUCKETS,
  path: string,
  file: File,
) => {
  const bucketName = STORAGE_BUCKETS[bucket];
  const { data, error } = await supabase.storage.from(bucketName).upload(path, file);
  
  if (error) throw error;
  
  const { data: publicUrl } = supabase.storage.from(bucketName).getPublicUrl(path);
  return publicUrl.publicUrl;
};

/**
 * Centralized folder deletion for cleanup.
 */
export const deleteFolder = async (bucket: keyof typeof STORAGE_BUCKETS, folderPath: string) => {
  const bucketName = STORAGE_BUCKETS[bucket];
  const { data: files, error: listError } = await supabase.storage.from(bucketName).list(folderPath);
  
  if (listError) throw listError;
  if (!files || files.length === 0) return;

  const toDelete = files.map((f) => `${folderPath}/${f.name}`);
  const { error: deleteError } = await supabase.storage.from(bucketName).remove(toDelete);
  
  if (deleteError) throw deleteError;
};
