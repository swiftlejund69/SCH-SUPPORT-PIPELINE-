import { supabase } from "./supabase";

export type StorageBucket =
  | "referral-documents"
  | "maintenance-media"
  | "sd-documents";

export type StoredMediaRef = {
  bucket: StorageBucket;
  path: string;
};

function sanitiseFileName(name: string) {
  const trimmed = name.trim().replace(/\s+/g, "-");
  return trimmed.replace(/[^A-Za-z0-9._-]/g, "");
}

function pickExtension(file: File) {
  const fromName = file.name.includes(".")
    ? file.name.slice(file.name.lastIndexOf(".") + 1).toLowerCase()
    : "";

  if (fromName) {
    return sanitiseFileName(fromName) || "bin";
  }

  if (file.type) {
    const subtype = file.type.split("/")[1];
    if (subtype) {
      return sanitiseFileName(subtype) || "bin";
    }
  }

  return "bin";
}

export function buildFilePath(parts: Array<string | number>, file: File) {
  const safeParts = parts.map((part) =>
    sanitiseFileName(String(part)) || "x",
  );
  const ext = pickExtension(file);
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `${safeParts.join("/")}/${unique}.${ext}`;
}

export async function uploadToBucket(
  bucket: StorageBucket,
  path: string,
  file: File,
) {
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });

  if (error) {
    throw new Error(`Could not upload to ${bucket}: ${error.message}`);
  }

  return path;
}

export async function uploadOne(
  bucket: StorageBucket,
  pathParts: Array<string | number>,
  file: File,
) {
  const path = buildFilePath(pathParts, file);
  await uploadToBucket(bucket, path, file);
  return path;
}

export async function uploadMany(
  bucket: StorageBucket,
  pathParts: Array<string | number>,
  files: File[],
) {
  const uploads = files.map((file) => uploadOne(bucket, pathParts, file));
  return Promise.all(uploads);
}

export async function getSignedUrl(
  bucket: StorageBucket,
  path: string,
  expiresInSeconds = 3600,
) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds);

  if (error || !data?.signedUrl) {
    throw new Error(
      `Could not sign URL for ${bucket}/${path}: ${error?.message ?? "unknown error"}`,
    );
  }

  return data.signedUrl;
}

export async function getSignedUrls(refs: StoredMediaRef[]) {
  const results = await Promise.all(
    refs.map(async (ref) => {
      try {
        const url = await getSignedUrl(ref.bucket, ref.path);
        return { ...ref, url };
      } catch (error) {
        console.error("Could not load media", ref, error);
        return null;
      }
    }),
  );

  return results.filter(
    (result): result is StoredMediaRef & { url: string } => result !== null,
  );
}
