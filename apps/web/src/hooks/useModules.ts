import { useSyncExternalStore } from 'react';
export const modules = [
  { id: 'astro', label: 'Astro', description: 'Mapas natais e céu diário', path: '/astro' },
  { id: 'herbarium', label: 'Herbário', description: 'Citações e fragmentos', path: '/herbarium' },
  { id: 'mood', label: 'Clima Interior', description: 'Registros emocionais locais', path: '/mood' },
  { id: 'diary', label: 'Diário', description: 'Escrita e novas memórias', path: '/diary' },
  { id: 'timeline', label: 'Timeline', description: 'Histórico das memórias', path: '/timeline' },
  { id: 'faith', label: 'Santuário', description: 'Liturgia e reflexões', path: '/faith' },
  { id: 'culture', label: 'Acervo', description: 'Coleções e descobertas', path: '/acervo' },
  { id: 'capsules', label: 'Cápsulas', description: 'Retrospectivas mensais', path: '/capsules' },
] as const;
export const widgets = [
  { id: 'astro', label: 'Astro' },
  { id: 'herbarium', label: 'Fragmentos do Herbário' },
  { id: 'liturgy', label: 'Liturgia diária' },
  { id: 'culture', label: 'Acervo recente' },
  { id: 'trends', label: 'Tendências emocionais' },
  { id: 'mood', label: 'Clima Interior' },
  { id: 'calendar', label: 'Calendário semanal' },
  { id: 'dimensions', label: 'Dimensões do Jardim' },
  { id: 'weather', label: 'Clima meteorológico' },
  { id: 'daily', label: 'Memórias do dia' },
  { id: 'recent', label: 'Memórias recentes' },
  { id: 'monthly', label: 'Cápsula mensal' },
] as const;
type ModuleId = typeof modules[number]['id'];
export type WidgetId = typeof widgets[number]['id'];
export const providers = ["YouTube","Spotify","IMDb","TMDB","X","Vimeo","Web"] as const;
type Provider = typeof providers[number];
export type WidgetSize = 'full' | 'half';
const defaultOrder: WidgetId[] = ['calendar','dimensions','mood','weather','daily','monthly','recent','liturgy','culture','trends','herbarium','astro'];
type Preferences = { order: WidgetId[]; sizes: Partial<Record<WidgetId, WidgetSize>>; richCards: boolean; providers: Record<Provider, boolean>; modules: Record<ModuleId, boolean>; widgets: Record<WidgetId, boolean> };
const key = 'jardim.modules.v1';
const defaults: Preferences = { order: defaultOrder, sizes: {}, richCards: true, providers: { YouTube:true, Spotify:true, IMDb:true, TMDB:true, X:true, Vimeo:true, Web:true }, modules: { astro: true, herbarium: true, mood: true, diary: true, timeline: true, faith: true, culture: true, capsules: true }, widgets: { astro: true, herbarium: true, liturgy: true, culture: true, trends: false, mood: true, calendar: true, dimensions: true, weather: true, daily: true, recent: true, monthly: true } };
function read(): Preferences {
  try {
    const raw = JSON.parse(localStorage.getItem(key) || '{}');
    const next: Preferences = { order: [...defaultOrder], sizes: {}, richCards: typeof raw?.richCards === "boolean" ? raw.richCards : true, providers: { ...defaults.providers }, modules: { ...defaults.modules }, widgets: { ...defaults.widgets } };
    if (Array.isArray(raw?.order)) {
      const valid = defaultOrder.filter(id => raw.order.includes(id));
      next.order = [...new Set<WidgetId>(raw.order.filter((id: unknown): id is WidgetId => valid.includes(id as WidgetId))), ...defaultOrder.filter(id => !valid.includes(id))];
    }
    for (const id of defaultOrder) if (raw?.sizes?.[id] === 'half' || raw?.sizes?.[id] === 'full') next.sizes[id] = raw.sizes[id];
    for (const id of providers) if (typeof raw?.providers?.[id] === "boolean") next.providers[id] = raw.providers[id];
    for (const { id } of modules) if (typeof raw?.modules?.[id] === 'boolean') next.modules[id] = raw.modules[id];
    for (const { id } of widgets) if (typeof raw?.widgets?.[id] === 'boolean') next.widgets[id] = raw.widgets[id];
    return next;
  } catch { return defaults; }
}
let current = read();
const listeners = new Set<() => void>();
function emit() { listeners.forEach(fn => fn()); }
function subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }
function persist(next: Preferences) { localStorage.setItem(key, JSON.stringify(next)); current = next; emit(); }
window.addEventListener('storage', e => { if (e.key === key || e.key === null) { current = read(); emit(); } });
export function useModules() { return useSyncExternalStore(subscribe, () => current); }
export function setModule(id: ModuleId, enabled: boolean) { persist({ ...current, modules: { ...current.modules, [id]: enabled } }); }
export function setWidget(id: WidgetId, enabled: boolean) { persist({ ...current, widgets: { ...current.widgets, [id]: enabled } }); }
export function moduleForPath(path: string) { return modules.find(m => m.path === path); }

export function setRichCards(enabled: boolean) { persist({ ...current, richCards: enabled }); }
export function setProvider(id: Provider, enabled: boolean) { persist({ ...current, providers: { ...current.providers, [id]: enabled } }); }

export function moveWidget(id: WidgetId, target: WidgetId) { const order = [...current.order]; const from = order.indexOf(id), to = order.indexOf(target); if(from < 0 || to < 0 || from === to) return; order.splice(from,1); order.splice(to,0,id); persist({...current,order}); }
export function resizeWidget(id: WidgetId, size: WidgetSize) { persist({...current,sizes:{...current.sizes,[id]:size}}); }
export function resetDashboard() { persist({...current,order:[...defaultOrder],sizes:{},widgets:{...defaults.widgets}}); }
