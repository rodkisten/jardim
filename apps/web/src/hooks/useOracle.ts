import { useEffect, useRef, useState } from 'react';
export function useOracle<T>(feature: 'astro', context: (value: T) => Record<string, unknown>) {
  const active = useRef<AbortController | null>(null);
  const [data, setData] = useState<{ text: string; model: string }>();
  const [isPending, setPending] = useState(false),
    [isError, setError] = useState(false),
    [errorMessage, setErrorMessage] = useState('');
  useEffect(
    () => () => {
      active.current?.abort();
      active.current = null;
    },
    [],
  );
  function reset() {
    active.current?.abort();
    active.current = null;
    setPending(false);
    setError(false);
    setErrorMessage('');
    setData(undefined);
  }
  function cancel() {
    active.current?.abort();
    active.current = null;
    setPending(false);
  }
  async function mutate(value: T) {
    if (active.current) return;
    const controller = new AbortController();
    active.current = controller;
    setPending(true);
    setError(false);
    setData(undefined);
    const timer = setTimeout(() => controller.abort(), 90000);
    try {
      const response = await fetch('/v2/oracle/' + feature, {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...context(value), consent: true }),
        signal: controller.signal,
      });
      if (response.status === 429)
        throw Error('Limite diário do Oráculo atingido. Renova à meia-noite UTC.');
      if (!response.ok || !response.body) throw Error('IA indisponível');
      const model = response.headers.get('X-Oracle-Model') ?? 'Workers AI';
      const reader = response.body.getReader(),
        decoder = new TextDecoder();
      let text = '',
        bytes = 0;
      try {
        while (true) {
          const chunk = await reader.read();
          if (chunk.done) break;
          bytes += chunk.value.byteLength;
          if (bytes > 65536) {
            await reader.cancel();
            throw Error('Resposta excede limite');
          }
          text += decoder.decode(chunk.value, { stream: true });
          if (active.current === controller) setData({ text, model });
        }
        text += decoder.decode();
        if (!text.trim()) throw Error('Resposta vazia');
        if (active.current === controller) setData({ text, model });
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      if (active.current === controller) {
        setError(true);
        setErrorMessage(error instanceof Error ? error.message : 'IA indisponível');
      }
    } finally {
      clearTimeout(timer);
      if (active.current === controller) {
        active.current = null;
        setPending(false);
      }
    }
  }
  return { data, isPending, isError, errorMessage, mutate, reset, cancel };
}
