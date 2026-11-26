import { useEffect, useState } from 'react';
import type { Editor } from '@tiptap/core';
import { useEditorState } from '@tiptap/react';
import { Button } from '@rodkisten/girassol/react';
import { ArrowUp, ArrowDown, Copy, Trash2, Plus } from 'lucide-react';
import { culturalLink } from '../utils/cultural-link';
import { editBlock } from '../utils/block-operations';
import type { ComposerAttachment } from '../utils/composer-store';
export function BlockMenu({
  editor,
  attachments,
}: {
  editor: Editor;
  attachments: ComposerAttachment[];
}) {
  const [manual, setManual] = useState(false),
    [filter, setFilter] = useState(''),
    [index, setIndex] = useState(0);
  const slash = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      if (!e || !e.isEditable || !e.state.selection.empty) return null;
      const p = e.state.selection.$from;
      if (!p.parent.isTextblock || p.parent.type.name === 'codeBlock') return null;
      const text = p.parent.textBetween(0, p.parentOffset);
      const match = text.match(/^\/([^\s/]*)$/);
      return match ? { query: match[1], from: p.start(), to: p.pos } : null;
    },
  });
  const query = manual ? filter : (slash?.query ?? '');
  const entries = [
    { label: 'Texto', run: () => editor.chain().focus().setParagraph().run() },
    { label: 'Título 1', run: () => editor.chain().focus().setHeading({ level: 1 }).run() },
    { label: 'Título 2', run: () => editor.chain().focus().setHeading({ level: 2 }).run() },
    { label: 'Título 3', run: () => editor.chain().focus().setHeading({ level: 3 }).run() },
    { label: 'Lista', run: () => editor.chain().focus().toggleBulletList().run() },
    { label: 'Lista numerada', run: () => editor.chain().focus().toggleOrderedList().run() },
    { label: 'Checklist', run: () => editor.chain().focus().toggleTaskList().run() },
    { label: 'Citação', run: () => editor.chain().focus().toggleBlockquote().run() },
    { label: 'Código snippet', run: () => editor.chain().focus().setCodeBlock().run() },
    {
      label: 'Tabela',
      run: () =>
        editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
    },
    {
      label: 'Mermaid diagrama',
      run: () =>
        editor
          .chain()
          .focus()
          .insertContent({
            type: 'codeBlock',
            attrs: { language: 'mermaid' },
            content: [{ type: 'text', text: 'flowchart TD\n  A --> B' }],
          })
          .run(),
    },
    {
      label: 'Fórmula matemática KaTeX',
      run: () =>
        editor
          .chain()
          .focus()
          .insertContent({
            type: 'codeBlock',
            attrs: { language: 'math' },
            content: [{ type: 'text', text: 'E = mc^2' }],
          })
          .run(),
    },
    {
      label: 'Link cultural YouTube Spotify TMDB',
      run: () => {
        const value = prompt('Cole o link cultural');
        const link = value && culturalLink(value);
        if (!link) return false;
        return editor
          .chain()
          .focus()
          .insertContent({
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: link.href,
                marks: [{ type: 'link', attrs: { href: link.href } }],
              },
            ],
          })
          .run();
      },
    },
    { label: 'Separador', run: () => editor.chain().focus().setHorizontalRule().run() },
    ...attachments
      .filter((a) => a.id)
      .map((a) => ({
        label: 'Anexo: ' + a.name,
        run: () =>
          editor
            .chain()
            .focus()
            .insertContent({ type: 'jardimMedia', attrs: { id: a.id } })
            .run(),
      })),
  ].filter((x) => x.label.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  const open = manual || !!slash;
  function choose(i: number) {
    const entry = entries[i];
    if (!entry) return;
    if (slash && !manual)
      editor.chain().focus().deleteRange({ from: slash.from, to: slash.to }).run();
    entry.run();
    setManual(false);
    setFilter('');
    setIndex(0);
  }
  useEffect(() => {
    setIndex(0);
  }, [query]);
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => {
      if (!editor.view.dom.contains(e.target as globalThis.Node)) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        setIndex((i) =>
          Math.max(0, Math.min(entries.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1))),
        );
      } else if (e.key === 'Enter' && entries.length) {
        e.preventDefault();
        e.stopPropagation();
        choose(index);
      } else if (e.key === 'Escape') {
        setManual(false);
        if (slash) editor.chain().focus().deleteRange({ from: slash.from, to: slash.to }).run();
      }
    };
    editor.view.dom.addEventListener('keydown', key, true);
    return () => editor.view.dom.removeEventListener('keydown', key, true);
  });
  return (
    <div className="relative border-b border-border p-2">
      <div className="flex flex-wrap items-center gap-1">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            setManual((v) => !v);
            setFilter('');
          }}
        >
          <Plus className="size-4" /> Bloco
        </Button>
        {(
          [
            { action: 'up', Icon: ArrowUp, label: 'Mover acima' },
            { action: 'down', Icon: ArrowDown, label: 'Mover abaixo' },
            { action: 'duplicate', Icon: Copy, label: 'Duplicar bloco' },
            { action: 'delete', Icon: Trash2, label: 'Excluir bloco' },
          ] as const
        ).map(({ action, Icon, label }) => (
          <Button
            key={action}
            type="button"
            size="icon"
            variant="ghost"
            aria-label={label}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              if (action !== 'delete' || confirm('Excluir bloco?')) editBlock(editor, action);
            }}
          >
            <Icon className="size-4" />
          </Button>
        ))}
        <span className="text-xs text-muted-foreground">Digite / para inserir</span>
      </div>
      {open && (
        <div
          className="mt-2 max-h-64 overflow-auto rounded-lg border border-border bg-card p-1"
          role="group"
          aria-label="Inserir bloco"
        >
          {manual && (
            <input
              className="w-full rounded border border-border bg-background p-2 text-base"
              placeholder="Buscar bloco"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              autoCapitalize="none"
            />
          )}
          {entries.map((entry, i) => (
            <button
              key={entry.label}
              type="button"
              className={
                'block w-full rounded p-2 text-left text-sm ' + (i === index ? 'bg-muted' : '')
              }
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(i)}
            >
              {entry.label}
            </button>
          ))}
          {!entries.length && <p className="p-2 text-sm">Nenhum bloco encontrado.</p>}
        </div>
      )}
    </div>
  );
}
