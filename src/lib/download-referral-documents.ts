import JSZip from "jszip";
import { getSignedUrls, type StorageBucket } from "./storage";

export type DownloadMediaItem = {
  bucket: StorageBucket;
  path: string;
  label: string;
  fileName: string;
};

function sanitiseZipName(value: string) {
  return (
    value
      .trim()
      .replace(/[<>:"/\\|?*]+/g, "-")
      .replace(/\s+/g, " ") || "document"
  );
}

export function buildReferralZipFolderName(
  fullName: string,
  roomNumber: string,
  address: string,
) {
  return sanitiseZipName(
    `${fullName}-Room(${roomNumber || "N/A"})-(${address || "N/A"})`,
  );
}

export async function downloadReferralDocumentsZip(
  items: DownloadMediaItem[],
  folderName: string,
) {
  if (items.length === 0) {
    throw new Error("No documents to download.");
  }

  const signed = await getSignedUrls(
    items.map((item) => ({ bucket: item.bucket, path: item.path })),
  );

  const zip = new JSZip();
  const root = zip.folder(sanitiseZipName(folderName));
  if (!root) {
    throw new Error("Could not create zip folder.");
  }

  for (let index = 0; index < signed.length; index += 1) {
    const entry = signed[index];
    const item = items[index];
    if (!entry || !item) {
      continue;
    }

    const response = await fetch(entry.url);
    if (!response.ok) {
      throw new Error(`Could not download ${item.label}.`);
    }

    const blob = await response.blob();
    const extMatch = item.path.match(/\.([a-z0-9]+)$/i);
    const ext = extMatch ? extMatch[1] : "bin";
    root.file(`${sanitiseZipName(item.fileName)}.${ext}`, blob);
  }

  const content = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(content);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${sanitiseZipName(folderName)}.zip`;
  anchor.click();
  URL.revokeObjectURL(url);
}
