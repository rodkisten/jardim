import { useEffect, useId, useRef } from 'react';
import { setUpdateBlocker } from '../utils/update-guard';
import { TableKit } from '@tiptap/extension-table';
import { TableTools } from './TableTools';
import { TechnicalContent } from './TechnicalContent';
import { BlockOutline } from './BlockOutline';
import { BlockMenu } from './BlockMenu';
import { MarkdownEditor } from './MarkdownEditor';
import { mediaMarker } from '../utils/markdown-media';
import { MediaContext, MediaNode } from './MediaNode';
import { useContext } from 'react';
import { languages, Snippet } from './Snippet';
import { useState } from 'react';
import { Markdown } from '@tiptap/markdown';
import Highlight from '@tiptap/extension-highlight';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import TextAlign from '@tiptap/extension-text-align';
import Typography from '@tiptap/extension-typography';
import { useEditor, EditorContent, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Undo,
  Redo,
  Heading2,
  Quote,
  Code2,
  Highlighter,
  ListChecks,
  Underline,
  Strikethrough,
  AlignCenter,
  Minus,
} from 'lucide-react';
import { Button } from '@rodkisten/girassol/react';
import { RichDocument } from '@rodkisten/jardim-contracts';
import type { Draft } from '../utils/draft';
export function DiaryEditor({
  draft,
  onChange,
}: {
  draft: Draft;
  onChange: (body: string, document: RichDocument) => void;
}) {
  const attachments = useContext(MediaContext);
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [split, setSplit] = useState(false),
    [markdownError, setMarkdownError] = useState('');
  const blocker = useId(),
    applying = useRef(false);
  const [insert, setInsert] = useState<{ text: string; nonce: number }>();
  const [language, setLanguage] = useState('typescript');
  const editor = useEditor({
    extensions: [
      TableKit.configure({ table: { resizable: false } }),
      MediaNode,
      Markdown,
      Highlight,
      TaskList,
      TaskItem.configure({ nested: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Typography,
      StarterKit.configure({ link: { autolink: true, linkOnPaste: true, openOnClick: false } }),
      Placeholder.configure({ placeholder: 'O que você quer lembrar de hoje?' }),
    ],
    content: draft.document
      ? {
          type: 'doc',
          content: draft.document.content as import('@tiptap/core').JSONContent[] | undefined,
        }
      : {
          type: 'doc',
          content: draft.body
            .split('\n')
            .map((line) => ({
              type: 'paragraph',
              content: line ? [{ type: 'text', text: line }] : [],
            })),
        },
    editorProps: {
      attributes: {
        class: 'min-h-48 p-3 text-base outline-none break-words',
        'aria-label': 'Conteúdo da memória',
      },
    },
    onUpdate: ({ editor }) => {
      if (applying.current) return;
      const parsed = RichDocument.safeParse(editor.getJSON());
      if (parsed.success) onChange(editor.getText(), parsed.data);
    },
  });
  useEffect(() => {
    return () => setUpdateBlocker('markdown:' + blocker, false);
  }, [blocker]);
  useEffect(() => {
    if (!editor || markdown === null) return;
    try {
      applying.current = true;
      editor.commands.setContent(markdown, { contentType: 'markdown', emitUpdate: false });
      const parsed = RichDocument.safeParse(editor.getJSON());
      if (!parsed.success) throw Error('Documento inválido');
      setMarkdownError('');
      setUpdateBlocker('markdown:' + blocker, false);
      onChange(editor.getText(), parsed.data);
    } catch {
      setMarkdownError('Markdown inválido. Corrija antes de publicar.');
      setUpdateBlocker('markdown:' + blocker, true);
    } finally {
      applying.current = false;
    }
  }, [markdown, editor, blocker]);
  const activeSnippet = useEditorState({
    editor,
    selector: ({ editor: instance }) => {
      if (!instance?.isActive('codeBlock')) return null;
      const from = instance.state.selection.$from;
      return {
        code: from.parent.textContent,
        language: String(from.parent.attrs.language ?? 'plaintext'),
        start: from.start(),
        end: from.end(),
      };
    },
  });
  if (!editor) return null;
  const tools = [
    {
      label: 'Título',
      Icon: Heading2,
      run: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    { label: 'Citação', Icon: Quote, run: () => editor.chain().focus().toggleBlockquote().run() },
    {
      label: 'Snippet',
      Icon: Code2,
      run: () => editor.chain().focus().toggleCodeBlock({ language }).run(),
    },
    {
      label: 'Realce',
      Icon: Highlighter,
      run: () => editor.chain().focus().toggleHighlight().run(),
    },
    {
      label: 'Checklist',
      Icon: ListChecks,
      run: () => editor.chain().focus().toggleTaskList().run(),
    },
    {
      label: 'Sublinhado',
      Icon: Underline,
      run: () => editor.chain().focus().toggleUnderline().run(),
    },
    {
      label: 'Riscado',
      Icon: Strikethrough,
      run: () => editor.chain().focus().toggleStrike().run(),
    },
    {
      label: 'Centralizar',
      Icon: AlignCenter,
      run: () => editor.chain().focus().setTextAlign('center').run(),
    },
    {
      label: 'Nova nota / separador',
      Icon: Minus,
      run: () => editor.chain().focus().setHorizontalRule().run(),
    },
    { label: 'Negrito', Icon: Bold, run: () => editor.chain().focus().toggleBold().run() },
    { label: 'Itálico', Icon: Italic, run: () => editor.chain().focus().toggleItalic().run() },
    { label: 'Lista', Icon: List, run: () => editor.chain().focus().toggleBulletList().run() },
    {
      label: 'Lista numerada',
      Icon: ListOrdered,
      run: () => editor.chain().focus().toggleOrderedList().run(),
    },
    { label: 'Desfazer', Icon: Undo, run: () => editor.chain().focus().undo().run() },
    { label: 'Refazer', Icon: Redo, run: () => editor.chain().focus().redo().run() },
  ];
  return (
    <div className="rounded-xl border border-border bg-card">
      {markdown === null && (
        <>
          <BlockMenu editor={editor} attachments={attachments} />
          <BlockOutline editor={editor} />
          <TableTools editor={editor} />
        </>
      )}
      <div
        className={markdown === null ? 'flex flex-wrap gap-1 border-b border-border p-1' : 'hidden'}
      >
        {tools.map(({ label, Icon, run }) => (
          <Button
            key={label}
            type="button"
            variant="ghost"
            size="icon"
            aria-label={label}
            onClick={run}
          >
            <Icon className="size-4" />
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 border-b border-border p-2">
        {(['Visual', 'Markdown', 'Split'] as const).map((mode) => (
          <Button
            key={mode}
            type="button"
            size="sm"
            variant={
              (
                mode === 'Visual'
                  ? markdown === null
                  : mode === 'Split'
                    ? markdown !== null && split
                    : markdown !== null && !split
              )
                ? 'default'
                : 'outline'
            }
            disabled={mode === 'Visual' && !!markdownError}
            onClick={() => {
              if (mode === 'Visual') {
                editor.setEditable(true);
                setMarkdown(null);
                setSplit(false);
                return;
              }
              if (markdown === null) {
                setInsert(undefined);
                setMarkdown(editor.getMarkdown());
              }
              editor.setEditable(false);
              setSplit(mode === 'Split');
            }}
          >
            {mode}
          </Button>
        ))}
      </div>
      {markdownError && (
        <p role="alert" className="p-2 text-sm text-destructive">
          {markdownError}
        </p>
      )}
      <div
        className={
          split && markdown !== null
            ? 'grid min-w-0 divide-y divide-border md:grid-cols-2 md:divide-x md:divide-y-0'
            : ''
        }
      >
        {markdown !== null && (
          <div className="min-w-0">
            <MarkdownEditor value={markdown} onChange={setMarkdown} insert={insert} />
          </div>
        )}
        {(markdown === null || split) && (
          <div className="min-w-0">
            <EditorContent editor={editor} />
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-1 p-2">
        {attachments
          .filter((a) => a.id)
          .map((a) => (
            <Button
              key={a.id}
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                if (markdown !== null) setInsert({ text: mediaMarker(a.id!), nonce: Date.now() });
                else
                  editor
                    .chain()
                    .focus()
                    .insertContent({ type: 'jardimMedia', attrs: { id: a.id } })
                    .run();
              }}
            >
              Inserir {a.name}
            </Button>
          ))}
      </div>
      <div className="flex items-center gap-2 border-t border-border p-2 text-xs">
        <label>
          Linguagem do snippet{' '}
          <select
            className="rounded border border-border bg-card p-1"
            value={language}
            onChange={(e) => {
              setLanguage(e.target.value);
              if (editor.isActive('codeBlock'))
                editor
                  .chain()
                  .focus()
                  .updateAttributes('codeBlock', { language: e.target.value })
                  .run();
            }}
          >
            {[...new Set([...languages, 'mermaid', 'math'])].map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </label>
      </div>
      {markdown === null &&
        activeSnippet &&
        ['mermaid', 'math', 'latex'].includes(activeSnippet.language) && (
          <TechnicalContent language={activeSnippet.language} source={activeSnippet.code} />
        )}
      {markdown === null && activeSnippet && (
        <Snippet
          code={activeSnippet.code}
          language={activeSnippet.language}
          onChange={(value) => {
            const { start, end } = activeSnippet;
            const tr = editor.state.tr;
            if (value) tr.replaceWith(start, end, editor.schema.text(value));
            else tr.delete(start, end);
            editor.view.dispatch(tr);
          }}
        />
      )}
    </div>
  );
}
