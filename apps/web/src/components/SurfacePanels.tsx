import { useState, type ReactNode } from 'react';
import { LayoutSortable, LayoutItem } from './LayoutSortable';
import { LayoutEditToggle } from './LayoutEditToggle';
import { useLayoutEditing } from '../hooks/useLayoutEditing';
import { useSurfaceLayout, reorderSurface, type Surface } from '../hooks/useSurfaceLayout';
export function SurfacePanels({
  surface,
  panels,
  labels,
}: {
  surface: Surface;
  panels: Record<string, ReactNode>;
  labels: Record<string, string>;
}) {
  const editing = useLayoutEditing();
  const order = useSurfaceLayout(surface).filter(
    (id) => panels[id] != null && panels[id] !== false,
  );
  const [error, setError] = useState('');
  return (
    <div className="space-y-4">
      <LayoutEditToggle />
      {error && <p role="alert">{error}</p>}
      <LayoutSortable
        order={order}
        onChange={(next) => {
          try {
            reorderSurface(surface, next);
            setError('');
          } catch {
            setError('Não foi possível salvar o layout.');
          }
        }}
      >
        {order.map((id) => (
          <LayoutItem key={id} id={id} label={labels[id] ?? id} enabled={editing}>
            {panels[id]}
          </LayoutItem>
        ))}
      </LayoutSortable>
    </div>
  );
}
