# Jardim 2.0 — Girassol
Status: implementação incremental; consultar CI e PR #32. 2026-11-26.

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
Já presentes: React, TanStack Router/Query, Dexie, Tiptap, CodeMirror, Lucide, jsquash AVIF/WebP, Mermaid, KaTeX. Avaliar shadcn/Radix para primitives, Motion para transições, Embla para galerias, Vaul para drawers, TanStack Virtual para listas, PhotoSwipe para fotos, WaveSurfer/Video.js para mídia, MiniSearch para busca, React Force Graph para constelações, Zod para fronteiras externas, date-fns para datas, Fontsource para fontes. Adicionar somente quando necessário; lazy-load módulos pesados. Reutilizar codecs existentes antes de adicionar Pica ou browser-image-compression.

## Entregas
1. Girassol: auditar rotas, estilos e componentes; temas, shell responsivo, home e navegação funcional; preservar dados e rotas existentes.
2. Santuário: CRUD local de orações, intenções e reflexões; integração litúrgica licenciada; timeline.
3. Acervo: contrato de providers e primeira integração pública validada, pesquisa, importação, coleção e timeline.
4. Memórias: PhotoIntel, mídia comprimida com fallback e preservação de orientação, relações e busca.
5. Herbário, Constelações, Cápsulas e Serendipidade.

## Aceite
Sem perda de dados, sem overflow horizontal no Safari iOS, teclado e foco acessíveis, estados vazio/loading/erro/offline, navegação real, persistência após reload, sem segredos no cliente. Rodar pnpm typecheck, build e lint; testes unitários somente para contratos, normalização e sincronização quando necessários. Preview único por PR. Não declarar funcionalidade pronta sem validação.

## Central de Controle e Module Registry
Registro tipado de módulos, rotas, widgets, providers, dependências e disponibilidade. Preferências versionadas e reativas, persistidas localmente; desativar não exclui dados. Ocultar navegação e widgets, bloquear rotas diretas e suspender tarefas e consultas específicas. Configurações e acesso a backup sempre disponíveis. Separar preferências de apresentação de autorização e consentimento de sincronização. Não oferecer switches fictícios para capacidades ainda não implementadas. Dashboard com ordenação, tamanho e visibilidade de widgets, drag and drop acessível com dnd-kit e alternativa por teclado. Futuramente persistir preferências no Dexie com migração; Zustand opcional se necessário.
## Rich Cards universais
Detectar URL colada no Tiptap, diário, memória, Inbox e Acervo. Preservar URL original, normalizar URL canônica, identificar provider e resolver metadados via adaptadores tipados no pacote cards existente. IMDb via TMDB find por external ID; TMDB direto; YouTube/Shorts, Spotify (faixas, álbuns, artistas, playlists, podcasts), X/Twitter, Vimeo, SoundCloud, TikTok, Reddit via oEmbed quando disponível; Instagram via API autorizada; Letterboxd, Wikipedia, GitHub e Open Graph genérico conforme acesso e termos. Fallback para link simples, estados loading/erro/offline, cache Dexie com TTL e atribuição. Cards compactos/expandidos, capa, autor, título, descrição, duração e ano quando disponíveis; nunca inventar campos. Embeds oficiais sob demanda, sem HTML arbitrário, allowlist de origens, CSP e sandbox conforme provider. Video.js para mídia compatível própria, WaveSurfer para áudio próprio. Backend com proteção SSRF, redirects validados, limites de tamanho e tempo, sem acesso a redes privadas; não implementar fetch genérico inseguro. Cheerio e DOMPurify apenas se necessários. Captura universal via compartilhamento iOS quando suportado e userscripts/RodX Studio, com Inbox e associação explícita à timeline.
## Clima Interior
Check-ins múltiplos por dia, humor em cinco níveis, energia, sono, ansiedade, sentimentos personalizados, atividades, fatores e nota opcional. Calendário mensal, histórico editável, gráficos Recharts, filtros, exportação e exclusão. Sem streaks obrigatórios, diagnóstico ou inferência causal. Dados fictícios apenas em demonstrações identificadas. Persistência local separada do mecanismo de sincronização de memórias; sincronização emocional e espiritual opcional e desligada por padrão para novos registros após implementação de armazenamento privado. Não afirmar que registros espirituais legados já são privados: auditar e migrar com consentimento. Nenhum envio a analytics. Lembretes opcionais.
## Roadmap adicional
1. Registry e Central de Controle: módulos existentes, rotas e widgets reais; expandir conforme implementação.
2. Rich Cards: resolver, cache, editor, Acervo e Inbox; controles por provider e detecção automática.
3. Clima Interior: armazenamento privado, check-ins e dashboard.
4. Dashboard Builder: ordenar e redimensionar widgets, persistir preferências, controles de privacidade.
5. Jardim conectado: relações com timeline e cápsulas, respeitando consentimento e módulos habilitados.

## Astro — dimensão violeta
Antes de Constelações: perfis próprios e de outras pessoas, mapas natais, céu por data e hora, trânsitos, fases lunares, sinastria, snapshots opcionais na timeline e widgets. Paleta Cosmos #171320, Nebulosa #302143, Ametista #8b5cf6, Lavanda #c4a5f5. SVG acessível para signos, planetas e aspectos. Perfis em Dexie separado, sem sincronização automática; exportação e exclusão; consentimento explícito antes de transmitir dados de nascimento. Não assumir timezone atual para datas históricas; exigir offset ou resolução histórica confiável. Separar efemérides astronômicas de interpretação simbólica. Avaliar Astronomy Engine, Swiss Ephemeris (licença), Prokerala, Free Astrology API, JPL Horizons, Open-Meteo Geocoding e GeoNames. Registry tipado, segredos no Worker, quotas, atribuição, cache e fallback; verificar contratos e custos antes de ativar. Não mostrar posições fictícias como reais. Etapa inicial: perfis locais e interface; cálculos e providers externos ainda pendentes.

## Oráculo — IA transversal
Workers AI como primeiro provider, reutilizando AI SDK e binding existente do Lectio. Primeira entrega: reflexão simbólica do céu selecionado, consentimento por solicitação, somente posições planetárias, sem nomes, cidade, data de nascimento ou diário. Sem persistência de respostas no aplicativo. Não garantir retenção zero pelo provider; auditar políticas e configuração de logs/cache. Próximos blocos: registry multi-provider, controles globais e por dimensão, limites de uso, streaming, prompts versionados, contexto selecionado explicitamente, recomendações culturais, conexões semânticas e retrospectivas. Nunca diagnosticar ou prever eventos como fatos. Sem acesso automático a registros privados.

### Quota inicial do Oráculo
20 solicitações por dia UTC por banco D1, compartilhadas entre sessões. Reserva atômica antes da inferência, somente após validação. Tentativas falhas ou canceladas também contam; não representa cobrança real nem cobre Lectio. GET autenticado /v2/oracle/usage expõe contagem. Aplicar migration antes de usar; falha de banco bloqueia geração.
