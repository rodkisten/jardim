import { mediaCache, cacheMetadata, pruneMetadata } from '../utils/media-cache';
import { useEffect, useRef, useState } from 'react';
import { Play, Pause } from 'lucide-react';
import { Button } from '@rodkisten/girassol/react';
import { waveform, mediaTime } from '../utils/waveform';
export function VoicePlayer({ id, url }: { id: string; url: string }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [peaks, setPeaks] = useState<number[]>([]),
    [time, setTime] = useState(0),
    [duration, setDuration] = useState(0),
    [playing, setPlaying] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    setPeaks([]);
    setTime(0);
    setDuration(0);
    setPlaying(false);
    setError('');
    let active = true;
    void mediaCache.metadata
      .get(id)
      .then((cached) => {
        if (active && cached?.peaks) setPeaks(cached.peaks);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [id, url]);
  async function analyze() {
    if (peaks.length) return;
    let context: AudioContext | undefined;
    try {
      context = new AudioContext();
      const response = await fetch(url);
      if (!response.ok) throw Error('Áudio indisponível');
      const buffer = await response.arrayBuffer();
      if (buffer.byteLength > 12 * 1024 * 1024) return;
      const decoded = await context.decodeAudioData(buffer);
      const next = waveform(decoded.getChannelData(0));
      setPeaks(next);
      void cacheMetadata(id, { peaks: next, duration: decoded.duration })
        .then(() => pruneMetadata())
        .catch(() => undefined);
    } catch {
      /* Native playback remains available. */
    } finally {
      await context?.close().catch(() => undefined);
    }
  }
  async function toggle() {
    const el = audio.current;
    if (!el) return;
    try {
      if (el.paused) {
        await el.play();
        void analyze();
      } else el.pause();
    } catch {
      setError('Não foi possível reproduzir o áudio.');
    }
  }
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <audio
        ref={audio}
        src={url}
        preload="metadata"
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onDurationChange={(e) => setDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
      <div className="flex items-center gap-3">
        <Button
          type="button"
          size="icon"
          aria-label={playing ? 'Pausar' : 'Reproduzir'}
          onClick={() => void toggle()}
        >
          {playing ? <Pause /> : <Play />}
        </Button>
        <div className="min-w-0 flex-1">
          {peaks.length > 0 && (
            <div aria-hidden="true" className="flex h-9 items-center gap-px">
              {peaks.map((p, i) => (
                <span
                  key={i}
                  className={
                    i / peaks.length < time / duration
                      ? 'flex-1 rounded bg-primary'
                      : 'flex-1 rounded bg-muted-foreground/40'
                  }
                  style={{ height: Math.max(8, p * 100) + '%' }}
                />
              ))}
            </div>
          )}
          <input
            aria-label="Posição do áudio"
            type="range"
            min={0}
            max={Number.isFinite(duration) ? duration : 0}
            step={0.1}
            value={time}
            onChange={(e) => {
              if (audio.current) audio.current.currentTime = Number(e.target.value);
            }}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{mediaTime(time)}</span>
            <span>{mediaTime(duration)}</span>
          </div>
        </div>
      </div>
      {error && (
        <p role="alert" className="text-xs">
          {error}
        </p>
      )}
    </div>
  );
}
