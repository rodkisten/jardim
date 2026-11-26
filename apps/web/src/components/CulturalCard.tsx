import { Music2, Film, ExternalLink, MessageCircle } from 'lucide-react';
import { embedUrl } from '../utils/cultural-link';
import { useEffect, useState } from 'react';
import { culturalLink } from '../utils/cultural-link';
import { loadLink, type LinkMetadata } from '../utils/link-cache';
export function CulturalCard({ value }: { value: string }) {
  const link = culturalLink(value);
  const href = link?.href;
  const [metadata, setMetadata] = useState<LinkMetadata>();
  const [image, setImage] = useState('');
  const [playing, setPlaying] = useState(false);
  useEffect(() => setPlaying(false), [href]);
  useEffect(() => {
    const controller = new AbortController();
    setMetadata(undefined);
    if (href) void loadLink(href, controller.signal).then(data => { if (!controller.signal.aborted) setMetadata(data); });
    return () => controller.abort();
  }, [href]);
  useEffect(() => {
    setImage('');
    if (!metadata?.image) return;
    const url = URL.createObjectURL(metadata.image);
    setImage(url);
    return () => URL.revokeObjectURL(url);
  }, [metadata]);
  if (!link) return null;
  const Icon = link.provider === 'Spotify' ? Music2 : link.provider === 'X' ? MessageCircle : Film;
  const embed = embedUrl(link.href);
  return <div className="overflow-hidden rounded-2xl border border-border bg-card"><a href={link.href} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-2xl border border-border bg-card">
    {image && <img src={image} alt="" className={link.provider === 'IMDb' || link.provider === 'TMDB' ? 'max-h-64 w-full object-contain bg-muted' : 'max-h-56 w-full object-cover'} />}
    <div className="flex items-start gap-3 p-4"><Icon className="size-5 shrink-0 text-primary" /><div className="min-w-0 flex-1 space-y-1"><p className="text-xs text-muted-foreground">{link.provider} · {link.kind}</p><h3 className="jardim-editorial break-words text-xl">{metadata?.title || 'Abrir conteúdo original'}</h3>{metadata?.description && <p className="line-clamp-3 text-sm text-muted-foreground">{metadata.description}</p>}<p className="truncate text-xs text-muted-foreground">{link.href}</p></div><ExternalLink className="size-4 shrink-0" /></div>
  </a>{embed && <div className="p-3">{playing ? <><button type="button" className="mb-2 text-xs underline" onClick={() => setPlaying(false)}>Fechar player</button><iframe title={'Player ' + link.provider} src={embed} className={link.provider === 'Spotify' ? 'h-40 w-full rounded-lg' : 'aspect-video w-full rounded-lg'} allow="encrypted-media; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-same-origin allow-presentation" /></> : <button type="button" className="rounded-lg border border-border px-3 py-2 text-sm" onClick={() => setPlaying(true)}>Carregar player externo</button>}</div>}</div>;
}
