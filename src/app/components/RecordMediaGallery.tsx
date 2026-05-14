"use client";

import { useEffect, useState } from "react";
import {
  getSignedUrls,
  type StorageBucket,
  type StoredMediaRef,
} from "../../lib/storage";

type MediaItem = StoredMediaRef & {
  kind: "photo" | "video";
  label?: string;
};

type RecordMediaGalleryProps = {
  title?: string;
  items: MediaItem[];
  emptyLabel?: string;
};

type ResolvedItem = MediaItem & { url: string };

function isLikelyImagePath(path: string) {
  return /\.(jpe?g|png|webp|gif|heic|heif|bmp|avif)$/i.test(path);
}

function isLikelyPdfPath(path: string) {
  return /\.pdf$/i.test(path);
}

export function RecordMediaGallery({
  title,
  items,
  emptyLabel,
}: RecordMediaGalleryProps) {
  const [resolved, setResolved] = useState<ResolvedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    if (items.length === 0) {
      setResolved([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const refs: StoredMediaRef[] = items.map((item) => ({
      bucket: item.bucket,
      path: item.path,
    }));

    void getSignedUrls(refs).then((signed) => {
      if (cancelled) {
        return;
      }
      const byKey = new Map(signed.map((entry) => [entry.path, entry.url]));
      const next: ResolvedItem[] = [];
      items.forEach((item) => {
        const url = byKey.get(item.path);
        if (url) {
          next.push({ ...item, url });
        }
      });
      setResolved(next);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [items]);

  if (items.length === 0) {
    if (emptyLabel) {
      return (
        <div className="media-gallery empty">
          {title && <h4>{title}</h4>}
          <p className="empty-records">{emptyLabel}</p>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="media-gallery">
      {title && <h4>{title}</h4>}
      {loading && resolved.length === 0 ? (
        <p className="empty-records">Loading attachments…</p>
      ) : (
        <ul className="media-grid">
          {resolved.map((item, index) => (
            <li
              className={`media-tile ${item.kind}`}
              key={`${item.bucket}-${item.path}`}
            >
              {isLikelyPdfPath(item.path) ? (
                <a
                  className="media-thumb media-thumb-doc"
                  href={item.url}
                  rel="noreferrer"
                  target="_blank"
                >
                  <span className="media-doc-icon" aria-hidden="true">PDF</span>
                  <span className="media-doc-text">
                    {item.label ?? "Document"}
                  </span>
                </a>
              ) : item.kind === "photo" || isLikelyImagePath(item.path) ? (
                <button
                  className="media-thumb"
                  onClick={() => setLightboxIndex(index)}
                  type="button"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img alt={item.label ?? "Attached photo"} src={item.url} />
                </button>
              ) : (
                <video controls preload="metadata" src={item.url}>
                  Your browser does not support video playback.
                </video>
              )}
              {item.label && <span className="media-label">{item.label}</span>}
              <a
                className="media-download"
                href={item.url}
                rel="noreferrer"
                target="_blank"
              >
                Open in new tab
              </a>
            </li>
          ))}
        </ul>
      )}
      {lightboxIndex !== null && resolved[lightboxIndex] && (
        <div
          className="media-lightbox"
          onClick={() => setLightboxIndex(null)}
          role="presentation"
        >
          {resolved[lightboxIndex].kind === "video" ? (
            <video
              autoPlay
              controls
              onClick={(event) => event.stopPropagation()}
              src={resolved[lightboxIndex].url}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt="Attached media"
              onClick={(event) => event.stopPropagation()}
              src={resolved[lightboxIndex].url}
            />
          )}
          <button
            aria-label="Close preview"
            className="media-lightbox-close"
            onClick={() => setLightboxIndex(null)}
            type="button"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
