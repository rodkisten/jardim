import { useEffect, useState } from 'react';
import { mediaCache, cacheMetadata, pruneMetadata } from '../utils/media-cache';
export function VideoPlayer({ id, url }: { id: string; url: string }) {
  const [poster, setPoster] = useState('');
  useEffect(() => {
    let active = true,
      objectUrl = '',
      timer: ReturnType<typeof setTimeout> | undefined;
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';
    function show(blob: Blob) {
      if (!active) return;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      objectUrl = URL.createObjectURL(blob);
      setPoster(objectUrl);
    }
    function release() {
      video.onloadedmetadata = null;
      video.onseeked = null;
      video.removeAttribute('src');
      video.load();
    }
    async function load() {
      const cached = await mediaCache.metadata.get(id).catch(() => undefined);
      if (!active) return;
      if (cached?.poster) {
        show(cached.poster);
        return;
      }
      video.onloadedmetadata = () => {
        video.currentTime = Math.min(1, Number.isFinite(video.duration) ? video.duration / 3 : 0);
      };
      video.onseeked = () => {
        if (!active || !video.videoWidth) return;
        try {
          const canvas = document.createElement('canvas');
          const scale = Math.min(1, 480 / Math.max(video.videoWidth, video.videoHeight));
          canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
          canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(
            (blob) => {
              if (blob && active) {
                show(blob);
                void cacheMetadata(id, { poster: blob })
                  .then(() => pruneMetadata())
                  .catch(() => undefined);
              }
              release();
            },
            'image/jpeg',
            0.75,
          );
        } catch {
          release();
        }
      };
      video.src = url;
      timer = setTimeout(release, 12000);
    }
    setPoster('');
    void load();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
      release();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id, url]);
  return (
    <video
      className="w-full rounded-lg"
      src={url}
      poster={poster || undefined}
      controls
      playsInline
      preload="none"
    />
  );
}
