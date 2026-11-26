import { CultureDiscovery } from '../components/CultureDiscovery';
import { Link } from '@tanstack/react-router';
import { BookOpen, Film, Headphones, Music, Palette, ArrowUpRight } from 'lucide-react';
import { DimensionNotes } from '../components/DimensionNotes';
import { useMemories } from '../hooks/useMemories';
import { MemoryList } from '../components/MemoryList';

const kinds = ['filme', 'série', 'livro', 'música', 'podcast', 'arte', 'artigo', 'vídeo'] as const;
export function Acervo() {
  const state = useMemories();
  const imported = state.memories.filter(m => m.tags.includes('spotify') && !m.tags.includes('cultura'));
  return (
    <div className="space-y-6">
      <section className="jardim-section-hero" data-tone="culture">
        <p className="jardim-eyebrow">Cultura e descobertas</p>
        <h1 className="jardim-editorial text-4xl">Acervo</h1>
        <p className="text-sm text-muted-foreground">Uma coleção daquilo que despertou sua curiosidade.</p>
        <div className="flex gap-4" aria-hidden="true"><Film /><BookOpen /><Music /><Headphones /><Palette /></div>
      </section>
      <Link to="/integrations" className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
        <div className="flex-1"><h2 className="jardim-editorial text-xl">Descobrir e importar</h2><p className="text-sm text-muted-foreground">Buscar filmes e séries no TMDB, conectar Spotify ou importar histórico.</p></div><ArrowUpRight className="size-5" />
      </Link>
      <CultureDiscovery />
      <DimensionNotes dimension="cultura" kinds={kinds} />
      <section className="space-y-3"><h2 className="jardim-editorial text-2xl">Histórico Spotify</h2><MemoryList {...state} memories={imported} /></section>
    </div>
  );
}
