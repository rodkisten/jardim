# Jardim 2.0 — Girassol
Status: proposta aprovada; implementação pendente. 2026-11-26.

## Visão
Um diário local-first que conecta memória, cultura, espiritualidade e descoberta pessoal. Não criar aplicativos isolados nem gamificar a fé.

## Design
Aurora: fundo #f2eee4, texto #352b21, destaque #ffd55e. Noite: fundo #191a18, texto #f7e9c7, destaque #f6d45e. Cores semânticas: fé #b99b69, cultura #a99acb, memória #94b3ca, interior #d4a69e, conhecimento #bd9676. Validar contraste WCAG; cores decorativas não substituem tokens de texto. Títulos serifados (avaliar Fraunces ou Lora), interface sans (Inter). Fontes locais via Fontsource. Cards editoriais, calendário horizontal, navegação flutuante com safe areas, desktop com sidebar. Inputs de pelo menos 16px no iOS para evitar zoom automático, sem impedir zoom de acessibilidade. Respeitar reduced motion.
 
## Experiências
- Hoje: calendário, jornada opcional, atalhos de dimensões, timeline real e descoberta diária.
- Santuário: liturgia, Bíblia, orações, intenções privadas, gratidão, homilias, calendário litúrgico, jornadas; cores litúrgicas opcionais.
- Acervo: filmes, séries, livros, música, arte, podcasts, vídeos, artigos; busca, coleções, avaliações, progresso e notas.
- Diário: Tiptap e CodeMirror 6, mídia, rascunhos, salvamento local.
- Memórias: PhotoIntel, calendário, filtros, relações com registros culturais.
- Herbário: fragmentos e citações com origem e direitos.
- Constelações: grafo de relações explícitas entre registros.
- Cápsulas: retrospectivas mensais editáveis, exportáveis.
- Serendipidade: descoberta diária opcional, sem exigir IA.

## Arquitetura
Preservar React 19, TanStack Router/Query, Tailwind, pacote Girassol, Dexie/local-db, contratos, Prisma/D1 e PWA. Inspecionar legado Solid antes de remover. Reutilizar captura e cards. Adaptadores externos atrás de uma interface tipada com capacidades, busca paginada, normalização, cache, cancelamento e erros discriminados. Credenciais privadas no Worker; nunca no bundle. OAuth com escopos mínimos. Cache respeitando licenças, TTL e rate limits; backoff em 429. Sem integração fictícia: indicar indisponível, desconectado ou offline.
 
## Modelo conceitual
Registro: id, tipo, dimensão, data de ocorrência, precisão temporal, timezone, título, conteúdo, tags, mídia, origem, createdAt, updatedAt, deletedAt. Referência externa: provider, externalId, canonicalUrl, attribution, fetchedAt. Relação: origem, destino, tipo. Reutilizar contratos atuais antes de migrar; deduplicar por provider/externalId por usuário; sincronização idempotente e conflitos explícitos. Dados espirituais e diário privados por padrão, sem telemetria de conteúdo. Exportação e exclusão.

## Providers candidatos
TMDB (cinema), Spotify/Last.fm/MusicBrainz (música), Open Library/Google Books (livros), Met Museum/Art Institute of Chicago (arte), Wikimedia (conhecimento), YouTube (vídeo), Listen Notes (podcasts), API.Bible e fonte católica autorizada (fé), Open-Meteo (clima), PhotoIntel (memórias). Validar acesso, custos, termos, atribuição e armazenamento antes de ativar. Não assumir acesso ao histórico completo de serviços.

## Bibliotecas
Já presentes: React, TanStack Router/Query, Dexie, Tiptap, CodeMirror, Lucide, jsquash AVIF/WebP, Mermaid, KaTeX. Avaliar shadcn/Radix para primitives, Motion para transições, Embla para galerias, Vaul para drawers, TanStack Virtual para listas, PhotoSwipe para fotos, WaveSurfer/Vidstack para mídia, MiniSearch para busca, React Force Graph para constelações, Zod para fronteiras externas, date-fns para datas, Fontsource para fontes. Adicionar somente quando necessário; lazy-load módulos pesados. Reutilizar codecs existentes antes de adicionar Pica ou browser-image-compression.

## Entregas
1. Girassol: auditar rotas, estilos e componentes; temas, shell responsivo, home e navegação funcional; preservar dados e rotas existentes.
2. Santuário: CRUD local de orações, intenções e reflexões; integração litúrgica licenciada; timeline.
3. Acervo: contrato de providers e primeira integração pública validada, pesquisa, importação, coleção e timeline.
4. Memórias: PhotoIntel, mídia comprimida com fallback e preservação de orientação, relações e busca.
5. Herbário, Constelações, Cápsulas e Serendipidade.

## Aceite
Sem perda de dados, sem overflow horizontal no Safari iOS, teclado e foco acessíveis, estados vazio/loading/erro/offline, navegação real, persistência após reload, sem segredos no cliente. Rodar pnpm typecheck, build e lint; testes unitários somente para contratos, normalização e sincronização quando necessários. Preview único por PR. Não declarar funcionalidade pronta sem validação.
