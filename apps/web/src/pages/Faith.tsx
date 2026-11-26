import { DimensionNotes } from '../components/DimensionNotes';
import { Lectio } from '../components/Lectio';
import { getFaith } from '../utils/faith-cache';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, CardContent, Input } from '@rodkisten/girassol/react';
import { Cross, BookOpen, CalendarDays, Heart } from 'lucide-react';
import {
  today,
  validDate,
  mysteryFor,
  mysteries,
  prayers,
  readings,
  text,
  rosaryNames,
  type FaithData,
} from '../utils/faith';
const names: Record<string, string> = {
  creed: 'Creio',
  signOfCross: 'Sinal da cruz',
  ourFather: 'Pai-nosso',
  hailMary: 'Ave Maria',
  gloryBe: 'Glória ao Pai',
  fatima: 'Oração de Fátima',
  hailHolyQueen: 'Salve Rainha',
};
export function Faith() {
  const [date, setDate] = useState(today());
  const query = useQuery({
    queryKey: ['faith', date],
    enabled: validDate(date),
    staleTime: 3600000,
    networkMode: 'always',
    queryFn: ({ signal }): Promise<FaithData> => getFaith(date, signal),
  });
  const key = mysteryFor(validDate(date) ? date : today()),
    rosary = query.data?.rosary ?? { type: key, mysteries: mysteries[key], prayers };
  const data = query.data;
  return (
    <section className="space-y-4">
      <div className="jardim-section-hero" data-tone="faith">
        <p className="jardim-eyebrow">Fé e contemplação</p>
        <h1 className="jardim-editorial text-4xl">Santuário</h1>
        <p className="text-sm text-muted-foreground">Liturgia, santos e terço em um só lugar.</p>
      </div>
      <div className="flex gap-2">
        <Input
          type="date"
          aria-label="Data da liturgia"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <Button variant="outline" onClick={() => setDate(today())}>
          Hoje
        </Button>
      </div>
      {query.isFetching && (
        <p role="status" className="text-sm text-muted-foreground">
          Carregando liturgia…
        </p>
      )}
      {query.isError && (
        <Button variant="outline" onClick={() => void query.refetch()}>
          Tentar carregar novamente
        </Button>
      )}
      <Card>
        <CardContent className="space-y-2">
          <CalendarDays className="size-5 text-primary" />
          <h2 className="font-semibold">Calendário litúrgico</h2>
          <p>{text(data?.calendar.celebration) || 'Celebração indisponível'}</p>
          <p className="text-sm text-muted-foreground">
            {text(data?.calendar.liturgicalSeason)} {text(data?.calendar.color)}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-3">
          <Cross className="size-5 text-primary" />
          <h2 className="font-semibold">Mistérios {rosaryNames[rosary.type] || rosary.type}</h2>
          <ol className="list-decimal space-y-2 pl-5 text-sm">
            {rosary.mysteries.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ol>
          {Object.entries(rosary.prayers).map(([name, prayer]) => (
            <details key={name} className="border-t border-border pt-2">
              <summary className="cursor-pointer text-sm font-medium">
                {names[name] || name}
              </summary>
              <p className="mt-2 text-sm leading-relaxed">{prayer}</p>
            </details>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-3">
          <BookOpen className="size-5 text-primary" />
          <h2 className="font-semibold">Leituras e Evangelho</h2>
          {data?.readings.status === 'available' && readings(data.readings.items).length ? (
            readings(data.readings.items).map((entry, i) => (
              <details key={i}>
                <summary className="cursor-pointer font-medium">{entry.label}</summary>
                <p className="mt-3 whitespace-pre-wrap font-serif text-lg leading-loose">
                  {entry.content}
                </p>
              </details>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              Leituras indisponíveis neste ambiente ou data.
            </p>
          )}
        </CardContent>
      </Card>
      {validDate(date) && (
        <Lectio
          key={date}
          date={date}
          passages={data?.readings.status === 'available' ? readings(data.readings.items) : []}
        />
      )}
      <Card>
        <CardContent className="space-y-3">
          <Heart className="size-5 text-primary" />
          <h2 className="font-semibold">Santos do dia</h2>
          {data?.saints.items?.length ? (
            data.saints.items.map((saint, i) => (
              <article key={i} className="space-y-2 border-t border-border pt-3">
                {typeof saint.image === 'string' && saint.image.startsWith('https://') && (
                  <img
                    src={saint.image}
                    alt={text(saint.name)}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="h-28 w-20 rounded-lg object-cover"
                  />
                )}
                <h3 className="font-medium">{text(saint.name)}</h3>
                <p className="whitespace-pre-wrap text-sm">{text(saint.biography)}</p>
                {text(saint.prayer) && (
                  <details>
                    <summary>Oração</summary>
                    <p className="text-sm">{text(saint.prayer)}</p>
                  </details>
                )}
              </article>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              Santos indisponíveis neste ambiente ou data.
            </p>
          )}
        </CardContent>
      </Card>
      <DimensionNotes dimension="fé" kinds={['oração', 'intenção', 'gratidão', 'reflexão']} />
    </section>
  );
}
