import { createEffect, createSignal, onCleanup, onMount } from 'solid-js';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Typography from '@tiptap/extension-typography';
import CharacterCount from '@tiptap/extension-character-count';
import './RichEditor.css';

/** The diary stores plain text today. Keep a lossless plain-text mirror until
 * the API and local schema support sanitized structured rich content. */
export function RichEditor(props: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  let host!: HTMLDivElement;
  let editor: Editor | undefined;
  const [revision, setRevision] = createSignal(0);
  const [more, setMore] = createSignal(false);
  const refresh = () => setRevision((n) => n + 1);
  const run = (command: (editor: Editor) => void) => {
    if (!editor) return;
    command(editor);
    refresh();
  };
  onMount(() => {
    editor = new Editor({
      element: host,
      content: { type: 'doc', content: [{ type: 'paragraph', content: props.value ? [{ type: 'text', text: props.value }] : [] }] },
      extensions: [
        StarterKit.configure({ link: false, underline: false }),
        Link.configure({ openOnClick: false, autolink: true, defaultProtocol: 'https' }),
        Underline,
        TextAlign.configure({ types: ['heading', 'paragraph'] }),
        Highlight.configure({ multicolor: true }),
        TaskList,
        TaskItem.configure({ nested: true }),
        Typography,
        CharacterCount.configure({ limit: 20000 }),
        Placeholder.configure({ placeholder: 'O que você quer guardar deste dia?' }),
      ],
      onUpdate: ({ editor: instance }) => {
        props.onChange(instance.getText({ blockSeparator: '\n' }));
        refresh();
      },
      onSelectionUpdate: refresh,
      onTransaction: refresh,
    });
    onCleanup(() => editor?.destroy());
  });
  createEffect(() => {
    const value = props.value;
    if (editor && editor.getText({ blockSeparator: '\n' }) !== value) {
      editor.commands.setContent(value, { emitUpdate: false });
      refresh();
    }
  });
  createEffect(() => editor?.setEditable(!props.disabled));
  const action = (label: string, fn: (editor: Editor) => void, active?: (editor: Editor) => boolean) => (
    <button type="button" aria-label={label} aria-pressed={editor && active ? active(editor) : undefined}
      class="rich-action" onClick={() => run(fn)}>{label}</button>
  );
  return (
    <div class="rich-editor">
      <div class="rich-toolbar" role="toolbar" aria-label="Formatação da memória">
        {action('Desfazer', (e) => e.chain().focus().undo().run())}
        {action('Refazer', (e) => e.chain().focus().redo().run())}
        {action('Negrito', (e) => e.chain().focus().toggleBold().run(), (e) => e.isActive('bold'))}
        {action('Itálico', (e) => e.chain().focus().toggleItalic().run(), (e) => e.isActive('italic'))}
        {action('Sublinhado', (e) => e.chain().focus().toggleUnderline().run(), (e) => e.isActive('underline'))}
        {action('Lista', (e) => e.chain().focus().toggleBulletList().run(), (e) => e.isActive('bulletList'))}
        {action('Checklist', (e) => e.chain().focus().toggleTaskList().run(), (e) => e.isActive('taskList'))}
        <button type="button" class="rich-action" aria-expanded={more()} onClick={() => setMore(!more())}>Mais ···</button>
      </div>
      {more() ? <div class="rich-toolbar" role="toolbar" aria-label="Formatação avançada">
        {action('Título', (e) => e.chain().focus().toggleHeading({ level: 2 }).run())}
        {action('Citação', (e) => e.chain().focus().toggleBlockquote().run())}
        {action('Código', (e) => e.chain().focus().toggleCodeBlock().run())}
        {action('Realce', (e) => e.chain().focus().toggleHighlight().run())}
        {action('Numerada', (e) => e.chain().focus().toggleOrderedList().run())}
        {action('Separador', (e) => e.chain().focus().setHorizontalRule().run())}
        {action('Esquerda', (e) => e.chain().focus().setTextAlign('left').run())}
        {action('Centro', (e) => e.chain().focus().setTextAlign('center').run())}
        {action('Direita', (e) => e.chain().focus().setTextAlign('right').run())}
        {action('Link', (e) => {
          const url = window.prompt('URL do link (https://)');
          if (url && /^https:\/\//i.test(url)) e.chain().focus().setLink({ href: url }).run();
        })}
        {action('Remover formatação', (e) => e.chain().focus().unsetAllMarks().clearNodes().run())}
      </div> : null}
      <div ref={host} class="rich-content" aria-label="Sua memória" />
      <div class="rich-footer" aria-live="polite">{revision() >= 0 ? editor?.storage.characterCount.characters() ?? props.value.length : 0} / 20000</div>
    </div>
  );
}
