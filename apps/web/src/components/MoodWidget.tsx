import { Link } from '@tanstack/react-router';
import { Heart } from 'lucide-react';
import { dayKey, moods, useMoodEntries } from '../utils/mood-db';
export function MoodWidget() {
  const { entries, loading, error } = useMoodEntries();
  const today = entries.find((e) => e.day === dayKey());
  return (
    <Link
      to="/mood"
      className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4"
    >
      <Heart className="size-6 text-primary" />
      <div>
        <h2 className="jardim-editorial text-xl">Clima Interior</h2>
        <p className="text-xs text-muted-foreground">
          {loading
            ? 'Carregando…'
            : error
              ? 'Abrir registros'
              : today
                ? 'Último check-in: ' + moods[today.mood - 1]
                : 'Como você está se sentindo?'}
        </p>
      </div>
    </Link>
  );
}
