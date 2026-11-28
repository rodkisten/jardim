import { Button } from '@rodkisten/girassol/react';
import { useLayoutEditing, setLayoutEditing } from '../hooks/useLayoutEditing';
export function LayoutEditToggle() {
  const editing = useLayoutEditing();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      aria-pressed={editing}
      onClick={() => setLayoutEditing(!editing)}
    >
      {editing ? 'Concluir edição' : 'Editar layout'}
    </Button>
  );
}
