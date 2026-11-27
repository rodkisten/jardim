import { LayoutSortable, LayoutItem } from '../components/LayoutSortable';
import { reorderWidgets, widgets as widgetDefinitions } from '../hooks/useModules';
import { AstroWidget } from '../components/LunarCalendar';
import { FaithWidget } from '../components/FaithWidget';
import { MoodTrendsWidget } from '../components/MoodTrends';
import { MoodWidget } from '../components/MoodWidget';
import { useModules, moduleForPath, type WidgetId } from '../hooks/useModules';
import { useState, type ReactNode } from 'react';
import { isPreview } from '../utils/preview';
import { WeatherCard } from '../components/WeatherCard';
import { Link } from '@tanstack/react-router';
import { ArrowUpRight, BookOpen, CalendarDays, Cross, Flower2, Layers, Plus, Search, MoonStar } from 'lucide-react';
import { localDay } from '../utils/timeline';
import { useMemories } from '../hooks/useMemories';
import { MemoryList } from '../components/MemoryList';

const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const dimensions = [
  { to: '/astro', title: 'Astro', description: 'Entre o céu e a terra', icon: MoonStar, tone: 'astro' },
  { to: '/herbarium', title: 'Herbário', description: 'Palavras que criam raízes', icon: BookOpen, tone: 'faith' },
  { to: '/faith', title: 'Santuário', description: 'Fé e contemplação', icon: Cross, tone: 'faith' },
  { to: '/acervo', title: 'Acervo', description: 'Guarde suas descobertas', icon: Search, tone: 'culture' },
  { to: '/timeline', title: 'Memórias', description: 'O que ficou de cada dia', icon: CalendarDays, tone: 'memory' },
  { to: '/mood', title: 'Clima Interior', description: 'Escreva o que sente', icon: BookOpen, tone: 'interior' },
] as const;

export function Home() {
  const state = useMemories();
  const { modules, widgets, order, sizes } = useModules();
  const now = new Date();
  const today = localDay(now, zone);
  const [selected, setSelected] = useState(today);
  const [editing,setEditing]=useState(false);
  const [layoutError,setLayoutError]=useState('');
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(now);
    date.setDate(now.getDate() + i - 6);
    return { date, key: localDay(date, zone) };
  });
  const current = state.memories.filter((m) => localDay(m.createdAt, zone) === selected);
  const monthly = state.memories.filter((m) => localDay(m.createdAt, zone).slice(0, 7) === today.slice(0, 7));
  const cultural = state.memories.filter(m => m.tags.includes('cultura') || m.tags.includes('spotify')).slice(0,3);
  const fragments = state.memories.filter(m=>m.tags.includes('herbário')).slice(0,2);
  const panels: Record<WidgetId, ReactNode> = {
    astro: modules.astro && widgets.astro && <AstroWidget />,
    herbarium: modules.herbarium && widgets.herbarium && <section className="space-y-3"><div className="flex items-center justify-between"><h2 className="jardim-editorial text-xl">Herbário</h2><Link to="/herbarium" className="text-xs text-muted-foreground">Abrir coleção</Link></div>{fragments.length ? <MemoryList {...state} memories={fragments}/> : <Link to="/herbarium" className="block rounded-xl border border-border p-4 text-sm">Guarde seu primeiro fragmento.</Link>}</section>,
    liturgy: modules.faith && widgets.liturgy && <FaithWidget date={today} />,
    culture: modules.culture && widgets.culture && <section className="space-y-3"><div className="flex items-center justify-between"><h2 className="jardim-editorial text-xl">Acervo recente</h2><Link to="/acervo" className="text-xs text-muted-foreground">Abrir acervo</Link></div><MemoryList {...state} memories={cultural}/></section>,
    trends: modules.mood && widgets.trends && <MoodTrendsWidget />,
calendar: (widgets.calendar && <section aria-label="Calendário da semana" className="space-y-3">
        <div className="flex items-center justify-between"><h2 className="jardim-editorial text-xl">Seus dias</h2>{modules.timeline && <Link to="/timeline" className="text-xs text-muted-foreground">Calendário completo</Link>}</div>
        <div className="grid grid-cols-7 gap-1.5">
          {days.map(({ date, key }) => <button key={key} type="button" aria-pressed={selected === key} aria-label={date.toLocaleDateString('pt-BR')} onClick={() => setSelected(key)} className="jardim-day">
            <span className="text-[10px] uppercase">{date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</span>
            <span className="text-lg font-semibold">{date.getDate()}</span>
            <span className="size-1 rounded-full bg-current" style={{ opacity: state.memories.some(m => localDay(m.createdAt, zone) === key) ? 1 : 0 }} />
          </button>)}
        </div>
      </section>),
dimensions: (widgets.dimensions && <section className="space-y-3">
        <h2 className="jardim-editorial text-2xl">Cultive seu mundo</h2>
        <div className="grid grid-cols-2 gap-3">
          {dimensions.filter(item => { const module = moduleForPath(item.to); return !module || modules[module.id]; }).map(({ to, title, description, icon: Icon, tone }) => <Link key={to} to={to} className="jardim-dimension" data-tone={tone}>
            <div className="flex items-center justify-between"><Icon className="size-6" strokeWidth={1.5} /><ArrowUpRight className="size-4 opacity-60" /></div>
            <div><h3 className="jardim-editorial text-xl">{title}</h3><p className="mt-1 text-xs opacity-80">{description}</p></div>
          </Link>)}
        </div>
      </section>),
mood: (modules.mood && widgets.mood && <MoodWidget />),
weather: (widgets.weather && !isPreview && <WeatherCard />),
daily: (widgets.daily && <section className="space-y-3">
        <div className="flex items-center justify-between"><h2 className="jardim-editorial text-2xl">{selected === today ? 'Memórias de hoje' : 'Memórias do dia'}</h2>{modules.timeline && <Link to="/timeline" className="text-xs text-muted-foreground">Ver todas</Link>}</div>
        <MemoryList {...state} memories={current} />
      </section>),
monthly: (widgets.monthly && modules.capsules && <Link to="/capsules" className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
        <Layers className="size-7 text-primary" /><div className="flex-1"><h2 className="jardim-editorial text-xl">Cápsula do mês</h2><p className="text-xs text-muted-foreground">{state.loading ? 'Carregando…' : monthly.length + ' memórias neste mês'}</p></div><ArrowUpRight className="size-4" />
      </Link>),
recent: (widgets.recent && <section className="space-y-3"><h2 className="jardim-editorial text-2xl">Últimas memórias</h2><MemoryList {...state} memories={state.memories.slice(0,5)} /></section>),
  };
  return (
    <div className="space-y-7">
      <section className="jardim-hero">
        <div className="relative z-10">
          <p className="jardim-eyebrow">{now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h1 className="jardim-editorial mt-3 text-4xl sm:text-5xl">Seu jardim,<br />hoje.</h1>
          <p className="mt-3 max-w-64 text-sm opacity-80">Tudo aquilo que você vive. Tudo aquilo que te transforma.</p>
          {modules.diary && <Link to="/diary" className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary-foreground px-4 py-3 text-sm font-semibold text-primary"><Plus className="size-4" /> Nova memória</Link>}
        </div>
        <Flower2 aria-hidden="true" className="jardim-hero-flower" strokeWidth={0.65} />
      </section>
      <div className="flex items-center justify-between"><button type="button" className="rounded-md border border-border px-3 py-2 text-sm" aria-pressed={editing} onClick={()=>setEditing(v=>!v)}>{editing?"Concluir edição":"Editar layout"}</button><Link to="/settings" className="text-xs text-muted-foreground underline">Personalizar dashboard</Link></div>
      {layoutError&&<p role="alert">{layoutError}</p>}
      <LayoutSortable order={order.filter(id=>Boolean(panels[id]))} onChange={next=>{try{const visible=new Set(next);let index=0;reorderWidgets(order.map(id=>visible.has(id)?next[index++]:id));setLayoutError('');}catch{setLayoutError('Não foi possível salvar o layout.');}}}>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {order.map(id => { const content = panels[id]; return content ? <LayoutItem key={id} id={id} enabled={editing} label={widgetDefinitions.find(w=>w.id===id)?.label??id} className={sizes[id] === 'half' ? 'min-w-0' : 'min-w-0 sm:col-span-2'}>{content}</LayoutItem> : null; })}
      </div></LayoutSortable>
    </div>
  );
}
