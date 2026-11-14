import { createEffect, createSignal, For, onCleanup } from 'solid-js';
import type { Memory } from '@rodkisten/jardim-contracts';
import './CommandPalette.css';

export function CommandPalette(props: {
  memories: Memory[];
  onCreate: () => void;
  onSearch: (query: string) => void;
  onNavigate: (section: string) => void;
}) {
  const [open, setOpen] = createSignal(false);
  const [query, setQuery] = createSignal('');
  const [selected, setSelected] = createSignal(0);
  let dialog!: HTMLDialogElement;
  let input!: HTMLInputElement;
  const commands = [
    { label: 'Nova memória', keywords: 'criar escrever adicionar', action: props.onCreate },
    { label: 'Ir para memórias', keywords: 'timeline notas', action: () => props.onNavigate('memorias') },
    { label: 'Ir para cápsulas', keywords: 'recap mês', action: () => props.onNavigate('capsulas') },
    { label: 'Ir para conexões', keywords: 'spotify integrações', action: () => props.onNavigate('integracoes') },
  ];
  const matches = () => {
    const term = query().trim().toLocaleLowerCase('pt-BR');
    const actions = commands.filter((command) => !term || (command.label + ' ' + command.keywords).toLocaleLowerCase('pt-BR').includes(term));
    const memories = term ? props.memories.filter((memory) => [memory.title, memory.body, ...memory.tags].some((text) => text.toLocaleLowerCase('pt-BR').includes(term))).slice(0, 6).map((memory) => ({
      label: memory.title,
      keywords: 'memória',
      action: () => props.onSearch(term),
    })) : [];
    return [...actions, ...memories].slice(0, 10);
  };
  const close = () => { dialog?.close(); setOpen(false); };
  const show = () => { setQuery(''); setSelected(0); setOpen(true); };
  const execute = (action: () => void) => { close(); action(); };
  createEffect(() => {
    if (open() && !dialog?.open) {
      dialog?.showModal();
      queueMicrotask(() => input?.focus());
    }
  });
  const keyboard = (event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      if (dialog?.open) close(); else show();
    }
  };
  window.addEventListener('keydown', keyboard);
  onCleanup(() => window.removeEventListener('keydown', keyboard));
  return <>
    <button type="button" class="command-trigger" onClick={show} aria-label="Abrir comandos e busca">
      <span aria-hidden="true">⌕</span><span>Buscar ou executar…</span><kbd>⌘ K</kbd>
    </button>
    <dialog ref={dialog} class="command-dialog" aria-label="Comandos rápidos" onClose={() => setOpen(false)} onCancel={() => setOpen(false)}>
      <div class="command-input-row">
        <span aria-hidden="true">⌕</span>
        <input ref={input} type="search" role="combobox" aria-autocomplete="list" aria-expanded={open()} aria-controls="command-results" aria-activedescendant={matches()[selected()] ? `command-option-${selected()}` : undefined} aria-label="Buscar comandos ou memórias" placeholder="Buscar memórias ou executar comando…" value={query()} onInput={(event) => { setQuery(event.currentTarget.value); setSelected(0); }}
          onKeyDown={(event) => {
            const items = matches();
            if (event.key === 'ArrowDown' && items.length) { event.preventDefault(); setSelected((selected() + 1) % items.length); }
            if (event.key === 'ArrowUp' && items.length) { event.preventDefault(); setSelected((selected() - 1 + items.length) % items.length); }
            if (event.key === 'Enter' && items[selected()]) { event.preventDefault(); execute(items[selected()].action); }
          }} />
        <button type="button" onClick={close} aria-label="Fechar">Esc</button>
      </div>
      <div id="command-results" class="command-results" role="listbox" aria-label="Resultados">
        <For each={matches()} fallback={<p class="command-empty">Nenhum resultado encontrado.</p>}>
          {(item, index) => <button id={`command-option-${index()}`} type="button" role="option" aria-selected={selected() === index()} classList={{ 'command-selected': selected() === index() }} onMouseEnter={() => setSelected(index())} onClick={() => execute(item.action)}>
            <span class="command-result-icon" aria-hidden="true">↗</span><span>{item.label}</span>
          </button>}
        </For>
      </div>
      <p class="command-hint">↑ ↓ navegar · Enter selecionar · Esc fechar</p>
    </dialog>
  </>;
}
