import { useEffect, useRef, useState } from 'react';
import { Button } from '@rodkisten/girassol/react';
import { ImagePlus, Video, Mic, Square, Trash2, Paperclip } from 'lucide-react';
import { type ComposerAttachment } from '../utils/composer-store';
import { setUpdateBlocker } from '../utils/update-guard';
function MediaPreview({ attachment }: { attachment: ComposerAttachment }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    const next = URL.createObjectURL(attachment.blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [attachment.blob]);
  if (!url) return null;
  const type = attachment.blob.type;
  if (type.startsWith('image/'))
    return (
      <img
        src={url}
        alt={attachment.name}
        className="max-h-72 w-full rounded-lg object-contain bg-muted"
      />
    );
  if (type.startsWith('video/'))
    return (
      <video
        src={url}
        controls
        playsInline
        preload="metadata"
        className="max-h-80 w-full rounded-lg bg-black"
      />
    );
  if (type.startsWith('audio/'))
    return <audio src={url} controls preload="metadata" className="w-full" />;
  return null;
}
export function ComposerMedia({
  attachments,
  onFiles,
  onRemove,
  onError,
}: {
  attachments: ComposerAttachment[];
  onFiles: (files: File[]) => void;
  onRemove: (index: number) => void;
  onError: (message: string) => void;
}) {
  const photo = useRef<HTMLInputElement>(null),
    video = useRef<HTMLInputElement>(null),
    audio = useRef<HTMLInputElement>(null);
  const recorder = useRef<MediaRecorder | null>(null),
    stream = useRef<MediaStream | null>(null),
    mounted = useRef(true),
    timer = useRef<ReturnType<typeof setInterval> | null>(null),
    starting = useRef(false);
  const [recording, setRecording] = useState(false),
    [seconds, setSeconds] = useState(0);
  const callback = useRef(onFiles);
  callback.current = onFiles;
  const error = useRef(onError);
  error.current = onError;
  function cleanup() {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    recorder.current = null;
    setUpdateBlocker('voice-recording', false);
  }
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (recorder.current?.state === 'recording') recorder.current.stop();
      cleanup();
    };
  }, []);
  async function record() {
    if (starting.current || recorder.current) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      audio.current?.click();
      return;
    }
    starting.current = true;
    setUpdateBlocker('voice-recording', true);
    try {
      const input = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current) {
        input.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = input;
      const mime = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find((t) =>
        MediaRecorder.isTypeSupported(t),
      );
      const instance = new MediaRecorder(input, mime ? { mimeType: mime } : undefined);
      recorder.current = instance;
      const chunks: Blob[] = [];
      let bytes = 0;
      let failed = false;
      instance.ondataavailable = (e) => {
        if (e.data.size) {
          chunks.push(e.data);
          bytes += e.data.size;
          if (bytes > 11 * 1024 * 1024 && instance.state === 'recording') instance.stop();
        }
      };
      instance.onerror = () => {
        failed = true;
        error.current('Não foi possível gravar áudio.');
        if (instance.state === 'recording') instance.stop();
      };
      instance.onstop = () => {
        const type = (instance.mimeType || chunks[0]?.type || 'audio/mp4').split(';')[0];
        const blob = new Blob(chunks, { type });
        cleanup();
        if (mounted.current) {
          setRecording(false);
          if (!failed && blob.size)
            callback.current([
              new File([blob], 'voz-' + Date.now() + (type === 'audio/mp4' ? '.m4a' : '.webm'), {
                type,
              }),
            ]);
        }
      };
      instance.start(500);
      setSeconds(0);
      setRecording(true);
      timer.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch (e) {
      cleanup();
      if (mounted.current)
        error.current(e instanceof Error ? e.message : 'Microfone indisponível.');
    } finally {
      starting.current = false;
    }
  }
  const pick = (event: React.ChangeEvent<HTMLInputElement>) => {
    onFiles(Array.from(event.target.files ?? []));
    event.target.value = '';
  };
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => photo.current?.click()}>
          <ImagePlus className="size-4" /> Foto
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => video.current?.click()}>
          <Video className="size-4" /> Vídeo
        </Button>
        <Button
          type="button"
          variant={recording ? 'default' : 'outline'}
          size="sm"
          onClick={() => (recording ? recorder.current?.stop() : void record())}
        >
          {recording ? <Square className="size-4" /> : <Mic className="size-4" />}
          {recording
            ? Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0')
            : 'Gravar áudio'}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => audio.current?.click()}>
          <Paperclip className="size-4" /> Áudio
        </Button>
      </div>
      <input hidden ref={photo} type="file" accept="image/*" multiple onChange={pick} />
      <input hidden ref={video} type="file" accept="video/*" multiple onChange={pick} />
      <input hidden ref={audio} type="file" accept="audio/*" multiple onChange={pick} />
      {attachments.map((attachment, i) => (
        <article
          key={attachment.name + attachment.lastModified}
          className="space-y-2 rounded-xl border border-border bg-card p-2"
        >
          <MediaPreview attachment={attachment} />
          <div className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-xs">{attachment.name}</span>
            <span className="text-xs text-muted-foreground">
              {Math.ceil(attachment.blob.size / 1024)} KB
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={'Remover ' + attachment.name}
              onClick={() => onRemove(i)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </article>
      ))}
    </section>
  );
}
