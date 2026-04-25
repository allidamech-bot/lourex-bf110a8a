import { supabase } from "@/integrations/supabase/client";

/**
 * Official storage buckets used in the Lourex app.
 */
export const STORAGE_BUCKETS = {
  PRODUCT_IMAGES: "product-images",
  DOCUMENTS: "documents",
} as const;

/**
 * Semantic paths within buckets.
 */
export const STORAGE_PATHS = {
  PURCHASE_REQUESTS: (id: string) => `purchase-requests/${sanitizePathSegment(id)}`,
  DEAL_ATTACHMENTS: (dealNumber: string) => `deal-attachments/${sanitizePathSegment(dealNumber)}`,
  TRANSFER_PROOFS: (requestId: string) => `transfer-proofs/${sanitizePathSegment(requestId)}`,
} as const;

const MAX_UPLOAD_SIZE_BYTES = 8 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const MIME_EXTENSION_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const sanitizePathSegment = (value: string) => {
  const normalized = value
      .trim()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^[-.]+|[-.]+$/g, "")
      .slice(0, 96);

  return normalized || "file";
};

const splitStoragePath = (path: string) => {
  const rawSegments = path
      .split("/")
      .map((segment) => segment.trim())
      .filter(Boolean);

  if (rawSegments.length === 0) {
    throw new Error("A valid storage path is required.");
  }

  return rawSegments;
};

const normalizeStoragePath = (path: string) => {
  const segments = splitStoragePath(path);

  if (segments.length === 1) {
    return sanitizePathSegment(segments[0]);
  }

  const folderSegments = segments.slice(0, -1).map(sanitizePathSegment);
  const fileName = sanitizeFileName(segments[segments.length - 1]);

  return [...folderSegments, fileName].join("/");
};

const getFileExtension = (file: File) => {
  const extensionFromMime = MIME_EXTENSION_MAP[file.type];

  if (extensionFromMime) {
    return extensionFromMime;
  }

  const extensionFromName = file.name.split(".").pop()?.toLowerCase();

  if (extensionFromName) {
    return sanitizePathSegment(extensionFromName);
  }

  return "file";
};

const sanitizeFileName = (fileName: string) => {
  const withoutQuery = fileName.split("?")[0] || fileName;
  const parts = withoutQuery.split(".");
  const extension = parts.length > 1 ? parts.pop() : "";
  const baseName = sanitizePathSegment(parts.join(".") || withoutQuery);

  if (!extension) {
    return baseName;
  }

  return `${baseName}.${sanitizePathSegment(extension.toLowerCase())}`;
};

const buildSafeUploadPath = (path: string, file: File) => {
  const segments = splitStoragePath(path);
  const folderSegments = segments.slice(0, -1).map(sanitizePathSegment);
  const originalFileName = segments[segments.length - 1] || file.name;
  const extension = getFileExtension(file);
  const baseName = sanitizeFileName(originalFileName).replace(/\.[^.]+$/, "");
  const uniqueSuffix =
      typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return [...folderSegments, `${baseName}-${uniqueSuffix}.${extension}`].join("/");
};

const validateUploadFile = (file: File) => {
  if (!(file instanceof File)) {
    throw new Error("A valid file is required.");
  }

  if (file.size <= 0) {
    throw new Error("The selected file is empty.");
  }

  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    throw new Error("Each uploaded file must be 8 MB or less.");
  }

  if (file.type.startsWith("image/") && !ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error("Only JPG, PNG, WEBP, or GIF images are supported.");
  }
};

/**
 * Centralized upload helper to ensure consistent bucket and path usage.
 */
export const uploadFile = async (
    bucket: keyof typeof STORAGE_BUCKETS,
    path: string,
    file: File,
) => {
  validateUploadFile(file);

  const bucketName = STORAGE_BUCKETS[bucket];
  const safePath = buildSafeUploadPath(path, file);

  const { error } = await supabase.storage.from(bucketName).upload(safePath, file, {
    cacheControl: "3600",
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from(bucketName).getPublicUrl(safePath);

  if (!data.publicUrl) {
    throw new Error("The file was uploaded but no public URL was returned.");
  }

  return data.publicUrl;
};

/**
 * Generates a signed URL for secure, temporary access to private files.
 */
export const getSignedUrl = async (
    bucket: keyof typeof STORAGE_BUCKETS,
    storagePath: string,
    expiresInSeconds = 3600,
) => {
  const bucketName = STORAGE_BUCKETS[bucket];
  
  const { data, error } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(storagePath, expiresInSeconds);

  if (error) {
    throw error;
  }

  return data.signedUrl;
};

/**
 * Centralized folder deletion for cleanup.
 */
export const deleteFolder = async (
    bucket: keyof typeof STORAGE_BUCKETS,
    folderPath: string,
) => {
  const bucketName = STORAGE_BUCKETS[bucket];
  const safeFolderPath = normalizeStoragePath(folderPath);

  const { data: files, error: listError } = await supabase.storage
      .from(bucketName)
      .list(safeFolderPath);

  if (listError) {
    throw listError;
  }

  if (!files || files.length === 0) {
    return;
  }

  const toDelete = files.map((file) => `${safeFolderPath}/${file.name}`);

  const { error: deleteError } = await supabase.storage
      .from(bucketName)
      .remove(toDelete);

  if (deleteError) {
    throw deleteError;
  }
};