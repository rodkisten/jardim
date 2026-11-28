import { useState } from 'react';
import { db } from '../utils/db';
import { Button } from '@rodkisten/girassol/react';
function Inline({ value }: { value: string }) {
  return (
    <>
      {value
        .split(/(\*\*[^*]+\*\*)/g)
        .map((part, i) =>
          part.startsWith('**') && part.endsWith('**') ? (
            <strong key={i}>{part.slice(2, -2)}</strong>
          ) : (
            part
          ),
        )}
    </>
  );
}
function Markdown({ text }: { text: string }) {
  return (
    <div className="space-y-2 break-words text-sm">
      {text.split('\n').map((line, i) => {
        const heading = line.match(/^#{1,6}\s+(.+)$/);
        if (heading)
          return (
            <h3 key={i} className="jardim-editorial text-lg">
              <Inline value={heading[1]} />
            </h3>
          );
        const item = line.match(/^\s*[-*]\s+(.+)$/);
        return item ? (
          <p key={i} className="pl-3">
            • <Inline value={item[1]} />
          </p>
        ) : line.trim() ? (
          <p key={i}>
            <Inline value={line} />
          </p>
        ) : null;
      })}
    </div>
  );
}
export function OracleResponse({
  data,
  error,
  errorMessage,
  onClear,
  pending = false,
}: {
  data?: { text: string; model: string };
  error: boolean;
  errorMessage?: string;
  onClear: () => void;
  pending?: boolean;
}) {
  const [notice, setNotice] = useState(''),
    [saving, setSaving] = useState(false),
    [saved, setSaved] = useState('');
  async function copy() {
    try {
      await navigator.clipboard.writeText(data?.text ?? '');
      setNotice('Copiado.');
    } catch {
      setNotice('Não foi possível copiar.');
    }
  }
  async function save() {
    if (!data || saving || pending || saved === data.text) return;
    setSaving(true);
    try {
      await db.plant({
        title: 'Reflexão do Oráculo',
        body: data.text + '\n\nGerado por IA: ' + data.model,
        tags: ['astro', 'oráculo', 'ia'],
      });
      setSaved(data.text);
      setNotice('Reflexão guardada como memória.');
    } catch {
      setNotice('Não foi possível guardar a reflexão.');
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="space-y-3">
      {error && <p role="alert">{errorMessage || 'IA indisponível. Tente novamente.'}</p>}
      {data && (
        <div className="space-y-3">
          <Markdown text={data.text} />
          <p className="text-xs opacity-70">{data.model} · Conteúdo gerado por IA</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={pending} onClick={() => void copy()}>
              Copiar
            </Button>
            <Button
              type="button"
              disabled={pending || saving || saved === data.text}
              onClick={() => void save()}
            >
              {saving ? 'Guardando…' : saved === data.text ? 'Guardado' : 'Guardar memória'}
            </Button>
            <Button
              type="button"
              onClick={() => {
                setNotice('');
                onClear();
              }}
            >
              Limpar
            </Button>
          </div>
        </div>
      )}
      <p role="status" className="text-xs">
        {pending ? 'Gerando reflexão…' : notice}
      </p>
    </div>
  );
}
