import type { Memory } from '@rodkisten/jardim-contracts';
import styles from './MemoryCard.module.css';
export function MemoryCard(props: { memory: Memory }) {
  const video = () =>
    props.memory.tags.includes('youtube')
      ? props.memory.body.match(
          /https:\/\/www\.youtube\.com\/watch\?v=[a-zA-Z0-9_-]{11}(?=\s|$)/,
        )?.[0]
      : undefined;
  return (
    <article class="memory">
      <time datetime={props.memory.createdAt}>
        {new Intl.DateTimeFormat('pt-BR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }).format(new Date(props.memory.createdAt))}
      </time>
      <h3>{props.memory.title}</h3>
      <p>{props.memory.body}</p>
      {video() ? (
        <a class={styles.source} href={video()} target="_blank" rel="noreferrer">
          ▶ Abrir no YouTube
        </a>
      ) : null}
      <div class="tags">
        {props.memory.tags.map((tag) => (
          <span>#{tag}</span>
        ))}
      </div>
    </article>
  );
}
