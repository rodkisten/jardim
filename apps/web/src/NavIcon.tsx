import type { JSX } from 'solid-js';
type IconName = 'memories' | 'capsules' | 'connections' | 'search' | 'plus';
const paths: Record<IconName, JSX.Element> = {
  memories: <><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></>,
  capsules: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  connections: <><circle cx="5" cy="12" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="19" cy="18" r="2"/><path d="m7 11 10-4M7 13l10 4"/></>,
  search: <><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></>,
  plus: <path d="M12 5v14M5 12h14"/>,
};
export function NavIcon(props: { name: IconName; size?: number }) {
  return <svg aria-hidden="true" width={props.size ?? 19} height={props.size ?? 19} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">{paths[props.name]}</svg>;
}
