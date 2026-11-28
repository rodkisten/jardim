import type { Memory } from '@rodkisten/jardim-contracts';
import { saveEmotionSuggestions } from './cultural-registry';
import type { EmotionSuggestion } from './cultural-insights';

// Conservative lexical cues, not a psychological assessment or trained classifier.
const cues: Record<string, string[]> = {
  alegria: ['feliz', 'alegria', 'contente', 'radiante'],
  tristeza: ['triste', 'tristeza', 'desanimado', 'melancolia'],
  gratidão: ['grato', 'gratidão', 'agradecido'],
  saudade: ['saudade', 'saudades'],
  medo: ['medo', 'assustado', 'amedrontado'],
  raiva: ['raiva', 'irritado', 'furioso'],
  esperança: ['esperança', 'esperançoso', 'otimista'],
  tranquilidade: ['tranquilo', 'sereno', 'calmo'],
  ansiedade: ['ansioso', 'ansiedade', 'preocupado'],
};

export function suggestEmotions(text: string, analyzedAt = new Date().toISOString()): EmotionSuggestion[] {
  const normalized = text.normalize('NFC').toLocaleLowerCase('pt-BR');
  const tokens = normalized.match(/[\p{L}]+/gu) ?? [];
  const negation = new Set(['não', 'nunca', 'nem', 'sem']);
  const results: EmotionSuggestion[] = [];
  for (const [label, words] of Object.entries(cues)) {
    let count = 0;
    for (let i = 0; i < tokens.length; i++) {
      if (words.includes(tokens[i]!) && !tokens.slice(Math.max(0, i - 3), i).some(t => negation.has(t))) count++;
    }
    if (count) results.push({ label, confidence: Math.min(0.65, 0.3 + count * 0.1), model: 'sentio-lexical-pt-v1', analyzedAt });
  }
  return results.sort((a, b) => b.confidence - a.confidence);
}

export async function analyzeNoteEmotions(memory: Memory, options: { enabled: boolean }) {
  if (!options.enabled) return [];
  const suggestions = suggestEmotions(memory.title + '\n' + memory.body);
  await saveEmotionSuggestions(memory.id, suggestions);
  return suggestions;
}
