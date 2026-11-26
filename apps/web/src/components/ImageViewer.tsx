import { useRef } from 'react';
import { X, Maximize2 } from 'lucide-react';
import { Button } from '@rodkisten/girassol/react';
export function ImageViewer({ url, name }: { url: string; name: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button
        type="button"
        className="relative block w-full"
        aria-label={'Ampliar ' + name}
        onClick={() => dialog.current?.showModal()}
      >
        <img
          className="max-h-80 w-full rounded-lg object-contain"
          src={url}
          alt={name}
          loading="lazy"
        />
        <span className="absolute bottom-2 right-2 rounded bg-background/80 p-2">
          <Maximize2 className="size-4" />
        </span>
      </button>
      <dialog
        ref={dialog}
        className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none bg-background text-foreground backdrop:bg-black/90"
      >
        <div className="flex h-full flex-col p-3">
          <div className="flex items-center justify-between">
            <span className="truncate text-sm">{name}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Fechar imagem"
              onClick={() => dialog.current?.close()}
            >
              <X />
            </Button>
          </div>
          <img src={url} alt={name} className="min-h-0 flex-1 object-contain" />
        </div>
      </dialog>
    </>
  );
}
