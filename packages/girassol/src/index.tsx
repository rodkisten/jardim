import type { JSX } from '@solidjs/web';
import styles from './components.module.css';
export function Button(props: JSX.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      type={props.type || 'button'}
      class={`${styles.button} ${props.class || ''}`}
    >
      {props.children}
    </button>
  );
}
export function Input(props: JSX.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} class={`${styles.input} ${props.class || ''}`} />;
}
export function Card(props: { children: JSX.Element; label?: string }) {
  return (
    <section class={styles.card} aria-label={props.label}>
      {props.children}
    </section>
  );
}
export function Badge(props: { children: JSX.Element }) {
  return <span class={styles.badge}>{props.children}</span>;
}
