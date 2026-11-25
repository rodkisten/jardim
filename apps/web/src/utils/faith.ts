export const mysteries = {
  joyful: ['A Anunciação do Anjo a Maria','A Visitação de Maria a Isabel','O Nascimento de Jesus','A Apresentação de Jesus no Templo','A Perda e o Encontro de Jesus no Templo'],
  sorrowful: ['A Agonia de Jesus no Horto','A Flagelação de Jesus','A Coroação de Espinhos','Jesus Carrega a Cruz','A Crucificação e Morte de Jesus'],
  glorious: ['A Ressurreição de Jesus','A Ascensão de Jesus','A Vinda do Espírito Santo','A Assunção de Maria','A Coroação de Maria'],
  luminous: ['O Batismo de Jesus no Jordão','As Bodas de Caná','O Anúncio do Reino de Deus','A Transfiguração de Jesus','A Instituição da Eucaristia'],
} as const;
export const prayers = {
  creed: 'Creio em Deus Pai todo-poderoso, criador do céu e da terra; e em Jesus Cristo, seu único Filho, nosso Senhor; que foi concebido pelo poder do Espírito Santo; nasceu da Virgem Maria, padeceu sob Pôncio Pilatos, foi crucificado, morto e sepultado; desceu à mansão dos mortos; ressuscitou ao terceiro dia; subiu aos céus; está sentado à direita de Deus Pai todo-poderoso, donde há de vir a julgar os vivos e os mortos. Creio no Espírito Santo; na santa Igreja Católica; na comunhão dos santos; na remissão dos pecados; na ressurreição da carne; na vida eterna. Amém.',
  signOfCross: 'Em nome do Pai, e do Filho, e do Espírito Santo. Amém.',
  ourFather: 'Pai nosso que estais nos céus, santificado seja o vosso nome; venha a nós o vosso Reino; seja feita a vossa vontade, assim na terra como no céu. O pão nosso de cada dia nos dai hoje; perdoai-nos as nossas ofensas, assim como nós perdoamos a quem nos tem ofendido; e não nos deixeis cair em tentação, mas livrai-nos do mal. Amém.',
  hailMary: 'Ave Maria, cheia de graça, o Senhor é convosco; bendita sois vós entre as mulheres, e bendito é o fruto do vosso ventre, Jesus. Santa Maria, Mãe de Deus, rogai por nós, pecadores, agora e na hora de nossa morte. Amém.',
  gloryBe: 'Glória ao Pai, e ao Filho, e ao Espírito Santo. Como era no princípio, agora e sempre. Amém.',
  fatima: 'Ó meu Jesus, perdoai-nos, livrai-nos do fogo do inferno, levai as almas todas para o céu e socorrei principalmente as que mais precisarem.',
  hailHolyQueen: 'Salve, Rainha, Mãe de misericórdia, vida, doçura e esperança nossa, salve! A vós bradamos, os degredados filhos de Eva. A vós suspiramos, gemendo e chorando neste vale de lágrimas. Eia, pois, advogada nossa, esses vossos olhos misericordiosos a nós volvei; e, depois deste desterro, mostrai-nos Jesus, bendito fruto do vosso ventre. Ó clemente, ó piedosa, ó doce sempre Virgem Maria. Rogai por nós, santa Mãe de Deus, para que sejamos dignos das promessas de Cristo. Amém.',
};
export function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T12:00:00Z');
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0,10) === value;
}
export function mysteryFor(date: string) {
  const day = new Date(date + 'T12:00:00Z').getUTCDay();
  return day === 1 || day === 6 ? 'joyful' : day === 2 || day === 5 ? 'sorrowful' : day === 4 ? 'luminous' : 'glorious';
}

type Entry = Record<string, unknown>;
export type FaithData = {
  date: string;
  calendar: { status: string; celebration?: unknown; color?: unknown; liturgicalSeason?: unknown };
  readings: { status: string; items?: unknown };
  saints: { status: string; items?: { name?: unknown; image?: unknown; biography?: unknown; prayer?: unknown }[] };
  rosary: { type: string; mysteries: string[]; prayers: Record<string, string> };
};
export const text = (value: unknown): string => typeof value === 'string' ? value : '';
export const rosaryNames: Record<string, string> = { joyful: 'Gozosos', sorrowful: 'Dolorosos', glorious: 'Gloriosos', luminous: 'Luminosos' };
export const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

export function readings(items: unknown): { label: string; content: string }[] {
  if (!items || typeof items !== 'object') return [];
  return Object.entries(items).flatMap(([label, value]) => {
    const values = Array.isArray(value) ? value : [value];
    return values.map((item) => {
      if (typeof item === 'string') return { label, content: item };
      if (!item || typeof item !== 'object') return { label, content: '' };
      const entry = item as Entry;
      return { label: text(entry.titulo) || text(entry.referencia) || label, content: text(entry.texto) || text(entry.conteudo) };
    }).filter((entry) => entry.content);
  });
}

