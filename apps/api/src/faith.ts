import { externalJson } from './external';
/** Personal Catholic resources for Jardim. No external text is presented as verified liturgy. */
const mysteries = {
  joyful: ['A Anunciação do Anjo a Maria','A Visitação de Maria a Isabel','O Nascimento de Jesus','A Apresentação de Jesus no Templo','A Perda e o Encontro de Jesus no Templo'],
  sorrowful: ['A Agonia de Jesus no Horto','A Flagelação de Jesus','A Coroação de Espinhos','Jesus Carrega a Cruz','A Crucificação e Morte de Jesus'],
  glorious: ['A Ressurreição de Jesus','A Ascensão de Jesus','A Vinda do Espírito Santo','A Assunção de Maria','A Coroação de Maria'],
  luminous: ['O Batismo de Jesus no Jordão','As Bodas de Caná','O Anúncio do Reino de Deus','A Transfiguração de Jesus','A Instituição da Eucaristia'],
} as const;
const prayers = {
  creed: 'Creio em Deus Pai todo-poderoso, criador do céu e da terra; e em Jesus Cristo, seu único Filho, nosso Senhor; que foi concebido pelo poder do Espírito Santo; nasceu da Virgem Maria, padeceu sob Pôncio Pilatos, foi crucificado, morto e sepultado; desceu à mansão dos mortos; ressuscitou ao terceiro dia; subiu aos céus; está sentado à direita de Deus Pai todo-poderoso, donde há de vir a julgar os vivos e os mortos. Creio no Espírito Santo; na santa Igreja Católica; na comunhão dos santos; na remissão dos pecados; na ressurreição da carne; na vida eterna. Amém.',
  signOfCross: 'Em nome do Pai, e do Filho, e do Espírito Santo. Amém.',
  ourFather: 'Pai nosso que estais nos céus, santificado seja o vosso nome; venha a nós o vosso Reino; seja feita a vossa vontade, assim na terra como no céu. O pão nosso de cada dia nos dai hoje; perdoai-nos as nossas ofensas, assim como nós perdoamos a quem nos tem ofendido; e não nos deixeis cair em tentação, mas livrai-nos do mal. Amém.',
  hailMary: 'Ave Maria, cheia de graça, o Senhor é convosco; bendita sois vós entre as mulheres, e bendito é o fruto do vosso ventre, Jesus. Santa Maria, Mãe de Deus, rogai por nós, pecadores, agora e na hora de nossa morte. Amém.',
  gloryBe: 'Glória ao Pai, e ao Filho, e ao Espírito Santo. Como era no princípio, agora e sempre. Amém.',
  fatima: 'Ó meu Jesus, perdoai-nos, livrai-nos do fogo do inferno, levai as almas todas para o céu e socorrei principalmente as que mais precisarem.',
  hailHolyQueen: 'Salve, Rainha, Mãe de misericórdia, vida, doçura e esperança nossa, salve! A vós bradamos, os degredados filhos de Eva. A vós suspiramos, gemendo e chorando neste vale de lágrimas. Eia, pois, advogada nossa, esses vossos olhos misericordiosos a nós volvei; e, depois deste desterro, mostrai-nos Jesus, bendito fruto do vosso ventre. Ó clemente, ó piedosa, ó doce sempre Virgem Maria. Rogai por nós, santa Mãe de Deus, para que sejamos dignos das promessas de Cristo. Amém.',
};
function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T12:00:00Z');
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0,10) === value;
}
function mysteryFor(date: string) {
  const day = new Date(date + 'T12:00:00Z').getUTCDay();
  return day === 1 || day === 6 ? 'joyful' : day === 2 || day === 5 ? 'sorrowful' : day === 4 ? 'luminous' : 'glorious';
}
function todayBrazil() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}
const unavailable = (resource: string): { status: 'unavailable'; resource: string; items: never[]; reason: string } => ({ status: 'unavailable', resource, items: [], reason: 'Fonte de conteúdo integral ainda não configurada ou validada; nenhum texto foi inventado.' });
type JsonRecord = Record<string, unknown>;
const record = (value: unknown): value is JsonRecord => !!value && typeof value === 'object' && !Array.isArray(value);
async function resource(url: string, name: string, fetcher: typeof fetch): Promise<{ status: 'available'; source: string; data: JsonRecord } | ReturnType<typeof unavailable>> {
  try {
    const data = await externalJson(url, {}, fetcher);
    if (!record(data)) throw Error('Formato de resposta inesperado');
    return { status: 'available', source: url, data };
  } catch {
    return unavailable(name);
  }
}
export async function faith(url: URL, fetcher: typeof fetch = fetch): Promise<Response> {
  const path = url.pathname.replace(/\/$/, '') || '/faith';
  const suffix = path.slice('/faith'.length);
  const explicit = /^\/(\d{4}-\d{2}-\d{2})$/.exec(suffix)?.[1];
  if (suffix && !explicit && !['/rosary','/prayers','/readings','/saints','/calendar'].includes(suffix))
    return Response.json({ error: 'Rota não encontrada' }, { status: 404 });
  const date = explicit || url.searchParams.get('date') || todayBrazil();
  if (!validDate(date)) return Response.json({ error: 'Data inválida: use AAAA-MM-DD' }, { status: 400 });
  const key = mysteryFor(date);
  const rosary = { date, type: key, mysteries: mysteries[key], prayers, sequence: ['signOfCross','creed','ourFather','hailMary × 3','gloryBe','5 decades: ourFather, hailMary × 10, gloryBe, fatima','hailHolyQueen'] };
  const [year, month, day] = date.split('-').map(Number);
  const liturgyUrl = new URL('https://liturgia.up.railway.app/v2/');
  liturgyUrl.search = new URLSearchParams({ dia: String(day), mes: String(month), ano: String(year) }).toString();
  const saintsUrl = `https://api.ordinarium.com.br/santo-do-dia/dia=${day}&mes=${month}`;
  const needsReadings = suffix === '' || !!explicit || suffix === '/readings' || suffix === '/calendar';
  const needsSaints = suffix === '' || !!explicit || suffix === '/saints';
  const [liturgy, saintsRaw] = await Promise.all([
    needsReadings ? resource(liturgyUrl.toString(), 'readings', fetcher) : Promise.resolve(unavailable('readings')),
    needsSaints ? resource(saintsUrl, 'saints', fetcher) : Promise.resolve(unavailable('saints')),
  ]);
  const readings = liturgy.status === 'available' && record(liturgy.data) && record(liturgy.data.leituras)
    ? { status: 'available', source: liturgy.source, items: liturgy.data.leituras }
    : unavailable('readings');
  const calendar = liturgy.status === 'available' && record(liturgy.data)
    ? { date, status: 'available', source: liturgy.source, celebration: liturgy.data.liturgia ?? null, color: liturgy.data.cor ?? null, prayers: liturgy.data.oracoes ?? null, antiphons: liturgy.data.antifonas ?? null, liturgicalSeason: null }
    : { date, status: 'unavailable', reason: 'Calendário litúrgico indisponível.' };
  const saints = saintsRaw.status === 'available' && record(saintsRaw.data) && Array.isArray(saintsRaw.data.results)
    ? { status: 'available', source: saintsRaw.source, items: saintsRaw.data.results.filter(record).map(s => ({ name: s.nome ?? null, image: s.imagem ?? null, biography: s.historia ?? null, reflection: s.reflexao ?? null, prayer: s.oracao ?? null, imageLicense: 'unverified' })) }
    : unavailable('saints');
  const result = suffix === '/rosary' ? rosary : suffix === '/prayers' ? prayers : suffix === '/readings' ? readings : suffix === '/saints' ? saints : suffix === '/calendar' ? calendar : { date, rosary, calendar, readings, saints, prayers };
  return Response.json(result, { headers: { 'Content-Language': 'pt-BR', 'Cache-Control': 'no-store' } });
}
