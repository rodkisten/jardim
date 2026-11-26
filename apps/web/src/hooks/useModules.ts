import { useSyncExternalStore } from 'react';
export const modules = [
  { id: 'mood', label: 'Clima Interior', description: 'Registros emocionais locais', path: '/mood' },
  { id: 'diary', label: 'Diário', description: 'Escrita e novas memórias', path: '/diary' },
  { id: 'timeline', label: 'Timeline', description: 'Histórico das memórias', path: '/timeline' },
  { id: 'faith', label: 'Santuário', description: 'Liturgia e reflexões', path: '/faith' },
  { id: 'culture', label: 'Acervo', description: 'Coleções e descobertas', path: '/acervo' },
  { id: 'capsules', label: 'Cápsulas', description: 'Retrospectivas mensais', path: '/capsules' },
] as const;
export const widgets = [
  { id: 'mood', label: 'Clima Interior' },
  { id: 'calendar', label: 'Calendário semanal' },
  { id: 'dimensions', label: 'Dimensões do Jardim' },
  { id: 'weather', label: 'Clima meteorológico' },
  { id: 'daily', label: 'Memórias do dia' },
  { id: 'recent', label: 'Memórias recentes' },
  { id: 'monthly', label: 'Cápsula mensal' },
] as const;
type ModuleId = typeof modules[number]['id'];
type WidgetId = typeof widgets[number]['id'];
export const providers = ["YouTube","Spotify","IMDb","TMDB","X","Vimeo","Web"] as const;
type Provider = typeof providers[number];
type Preferences = { richCards: boolean; providers: Record<Provider, boolean>; modules: Record<ModuleId, boolean>; widgets: Record<WidgetId, boolean> };
const key = 'jardim.modules.v1';
const defaults: Preferences = { richCards: true, providers: { YouTube:true, Spotify:true, IMDb:true, TMDB:true, X:true, Vimeo:true, Web:true }, modules: { mood: true, diary: true, timeline: true, faith: true, culture: true, capsules: true }, widgets: { mood: true, calendar: true, dimensions: true, weather: true, daily: true, recent: true, monthly: true } };
function read(): Preferences {
  try {
    const raw = JSON.parse(localStorage.getItem(key) || '{}');
    const next = { richCards: typeof raw?.richCards === "boolean" ? raw.richCards : true, providers: { ...defaults.providers }, modules: { ...defaults.modules }, widgets: { ...defaults.widgets } };
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
