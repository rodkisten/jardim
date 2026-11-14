import { For, Show } from 'solid-js';
import type { JSX } from 'solid-js';
import type { Memory } from '@rodkisten/jardim-contracts';

/** Render a small allowlist of Tiptap nodes. Never inject stored HTML. */
type Node = { type?: unknown; text?: unknown; attrs?: unknown; marks?: unknown; content?: unknown };
const nodes = (value: unknown): Node[] =>
  Array.isArray(value) ? value.filter((item): item is Node => !!item && typeof item === 'object' && !Array.isArray(item)).slice(0, 500) : [];
const attrs = (node: Node): Record<string, unknown> =>
  node.attrs && typeof node.attrs === 'object' && !Array.isArray(node.attrs) ? node.attrs as Record<string, unknown> : {};
function safeLink(value: unknown): string | undefined {
  if (typeof value !== 'string') return;
  try {
    const url = new URL(value);
    return ['https:', 'http:', 'mailto:'].includes(url.protocol) ? url.href : undefined;
  } catch { return; }
}
function Inline(props: { node: Node }): JSX.Element {
  const text = () => typeof props.node.text === 'string' ? props.node.text.slice(0, 20000) : '';
  const marks = () => nodes(props.node.marks);
  const bold = () => marks().some((m) => m.type === 'bold');
  const italic = () => marks().some((m) => m.type === 'italic');
  const underline = () => marks().some((m) => m.type === 'underline');
  const strike = () => marks().some((m) => m.type === 'strike');
  const code = () => marks().some((m) => m.type === 'code');
  const highlight = () => marks().some((m) => m.type === 'highlight');
  const href = () => safeLink(attrs(marks().find((m) => m.type === 'link') || {}).href);
  return <span>{href() ? <a href={href()} rel="nofollow noopener noreferrer" target="_blank">{renderText()}</a> : renderText()}</span>;
  function renderText() {
    let value: JSX.Element = text();
    if (code()) value = <code>{value}</code>;
    if (highlight()) value = <mark>{value}</mark>;
    if (strike()) value = <s>{value}</s>;
    if (underline()) value = <u>{value}</u>;
    if (italic()) value = <em>{value}</em>;
    if (bold()) value = <strong>{value}</strong>;
    return value;
  }
}
function RichNode(props: { node: Node; depth?: number }): JSX.Element {
  const children = () => (props.depth ?? 0) >= 12 ? [] : nodes(props.node.content);
  const nested = () => <For each={children()}>{(child) => <RichNode node={child} depth={(props.depth ?? 0) + 1} />}</For>;
  switch (props.node.type) {
    case 'text': return <Inline node={props.node} />;
    case 'paragraph': return <p>{nested()}</p>;
    case 'heading': return <h3>{nested()}</h3>;
    case 'blockquote': return <blockquote>{nested()}</blockquote>;
    case 'bulletList': return <ul>{nested()}</ul>;
    case 'orderedList': return <ol>{nested()}</ol>;
    case 'taskList': return <ul class="rich-task-list">{nested()}</ul>;
    case 'listItem': return <li>{nested()}</li>;
    case 'taskItem': return <li><input type="checkbox" checked={attrs(props.node).checked === true} disabled />{nested()}</li>;
    case 'codeBlock': return <pre><code>{nested()}</code></pre>;
    case 'hardBreak': return <span>{'\n'}</span>;
    case 'horizontalRule': return <hr />;
    default: return <>{nested()}</>;
  }
}
export function RichMemory(props: { memory: Memory }) {
  const document = () => props.memory.richDocument as Node | undefined;
  const plain = () => props.memory.body.replace(/\[anexo:[a-f0-9-]{36}\]/g, '').replace(/\[clima:.*\]/g, '');
  return <div class="rich-memory">
    <Show when={document()?.type === 'doc'} fallback={<p>{plain()}</p>}>
      <For each={nodes(document()?.content)}>{(node) => <RichNode node={node} />}</For>
    </Show>
  </div>;
}
