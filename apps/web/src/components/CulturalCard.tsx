import { Music2, Film, ExternalLink } from 'lucide-react';
import { culturalLink } from '../utils/cultural-link';
export function CulturalCard({ value }: { value: string }) {
  const link = culturalLink(value);
  if (!link) return null;
  const Icon = link.provider === 'Spotify' ? Music2 : Film;
  return (
    <a
      href={link.href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
    >
      <div className="rounded-lg bg-muted p-3">
        <Icon className="size-6 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">
          {link.provider} · {link.kind}
        </p>
        <p className="truncate text-xs text-muted-foreground">{link.href}</p>
        <p className="text-xs text-muted-foreground">Abrir conteúdo original</p>
      </div>
      <ExternalLink className="size-4" />
    </a>
  );
}
