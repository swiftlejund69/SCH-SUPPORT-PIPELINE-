import type { InspectionReport } from "../app/types";
import {
  downloadReferralDocumentsZip,
  type DownloadMediaItem,
} from "./download-referral-documents";

function pathBasename(path: string) {
  const parts = path.split("/");
  return parts[parts.length - 1] ?? path;
}

export function getInspectionReportDownloadItems(
  report: InspectionReport | undefined,
): DownloadMediaItem[] {
  if (!report) {
    return [];
  }

  const items: DownloadMediaItem[] = [];

  report.problems.forEach((problem, problemIndex) => {
    problem.photoPaths?.forEach((path, i) => {
      items.push({
        bucket: "maintenance-media",
        path,
        label: `Problem ${problemIndex + 1} photo ${i + 1}`,
        fileName: `problem-${problemIndex + 1}-photo-${i + 1}-${pathBasename(path)}`,
      });
    });
    problem.videoPaths?.forEach((path, i) => {
      items.push({
        bucket: "maintenance-media",
        path,
        label: `Problem ${problemIndex + 1} video ${i + 1}`,
        fileName: `problem-${problemIndex + 1}-video-${i + 1}-${pathBasename(path)}`,
      });
    });
  });

  report.maintenancePhotoPaths?.forEach((path, i) => {
    items.push({
      bucket: "maintenance-media",
      path,
      label: `Maintenance photo ${i + 1}`,
      fileName: `maintenance-photo-${i + 1}-${pathBasename(path)}`,
    });
  });
  report.maintenanceVideoPaths?.forEach((path, i) => {
    items.push({
      bucket: "maintenance-media",
      path,
      label: `Maintenance video ${i + 1}`,
      fileName: `maintenance-video-${i + 1}-${pathBasename(path)}`,
    });
  });
  report.cleaningPhotoPaths?.forEach((path, i) => {
    items.push({
      bucket: "maintenance-media",
      path,
      label: `Cleaning photo ${i + 1}`,
      fileName: `cleaning-photo-${i + 1}-${pathBasename(path)}`,
    });
  });
  report.cleaningVideoPaths?.forEach((path, i) => {
    items.push({
      bucket: "maintenance-media",
      path,
      label: `Cleaning video ${i + 1}`,
      fileName: `cleaning-video-${i + 1}-${pathBasename(path)}`,
    });
  });

  return items;
}

export async function downloadInspectionDocumentsZip(
  report: InspectionReport | undefined,
  folderName: string,
) {
  const items = getInspectionReportDownloadItems(report);
  await downloadReferralDocumentsZip(items, folderName);
}
