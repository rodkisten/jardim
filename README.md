# 🌱 Jardim

> **Um lugar para cultivar memórias.** Um jardim digital pessoal, local-first, que conecta acontecimentos, registros, descobertas, mídia e a trilha sonora da vida.

**Status:** 🌱 Primeira entrega em produção · **Público-alvo:** uso pessoal, single-user · **Idioma:** pt-BR · **Design system:** 🌻 Girassol

> [!IMPORTANT]
> Este README é a **fonte de verdade do escopo e do progresso**. Checkboxes representam trabalho efetivamente concluído e validado, não apenas discutido. Atualizar este documento em toda PR que adicionar, alterar ou remover uma funcionalidade.

## Primeira entrega · 12/11/2026

Acesse **https://jardim.migos.club**. Autenticação inicial por senha no Worker, **sem Cloudflare Access**, conforme solicitado. A senha de produção fica exclusivamente no secret `JARDIM_PASSWORD`; não está no repositório. Sessões aleatórias de sete dias, cookies HttpOnly/Secure/SameSite, revogação no logout, validação de origem e limite de tentativas por IP.

### Disponível

- [x] Diário inicial: criar memórias de texto com título e tags.
- [x] Timeline cronológica e busca textual local.
- [x] IndexedDB/Dexie: memória e outbox na mesma transação.
- [x] Envio idempotente por operação para D1 e pull paginado para outros dispositivos.
- [x] Retomada ao abrir, voltar à aba, recuperar conexão e durante atividade.
- [x] Exportação JSON das memórias disponíveis no dispositivo.
- [x] Worker, D1, domínio HTTPS, logs e traces configurados.
- [x] Solid 2 RC + compilação TSX + Vite e teste de interação do bundle compilado.

### Limites desta entrega

Somente **criação de memórias imutáveis**. Edição, exclusão, conflitos, anexos, PWA/cache de aplicação, capturadores, Prisma, R2, clima, Spotify, TMDB e cápsulas continuam pendentes. Salvar sem conexão funciona enquanto a aplicação já está aberta; abrir/recarregar completamente offline ainda depende da futura PWA. Exportação não inclui itens de outros dispositivos ainda não recebidos por sincronização. Os pacotes iniciais possuem manifests e `pnpm-workspace.yaml`; Turborepo e a migração completa de scripts para pnpm ainda não foram entregues. Nenhum componente Girassol foi publicado como pacote independente.

O preset Solid 2 disponível e o runtime RC atual divergem no mecanismo interno de eventos delegados. A compilação usa `delegateEvents: false`; o teste `tests/ui.test.ts` verifica salvar e buscar usando o bundle real. TanStack permanece sem validação e não foi introduzido.

Os pequenos assets iniciais são empacotados com o Worker para uma publicação única e proteção uniforme; `tooling/assets.mjs` gera o mapa antes do bundle. Reavaliar Workers Static Assets ao crescer. Nenhum segredo é incorporado ao JavaScript do navegador.

### Desenvolvimento e verificações

```bash
npm ci
npm run build
npx wrangler types
npm run check
cp .dev.vars.example .dev.vars
# Defina uma senha de desenvolvimento em .dev.vars.
npx wrangler d1 migrations apply jardim --local
npx wrangler dev --local-protocol https
```

`npm run check` executa build, TypeScript strict e Vitest. Os testes cobrem contratos, persistência, reenvio, confirmação parcial, cursor inválido, tamanho de requisição, autenticação, CSRF, SQL/migração SQLite, idempotência, logout, tentativas de login e UI Solid compilada. O teste SQLite usa o SQL real do Worker; não substitui teste do adaptador Prisma/D1 ainda pendente.

`tests/browser.mjs` contém o cenário Chromium de ponta a ponta; requer Chromium executável (`CHROMIUM_PATH`, ou `/usr/bin/chromium`) e servidor HTTPS local. Nesta sessão, Chromium e Wrangler dev foram bloqueados pelas restrições de sockets do executor; **não declarar E2E/Safari concluídos**. A tela de entrada em produção foi inspecionada visualmente. O smoke HTTP remoto passou em login, senha incorreta, cookie seguro, SPA protegida, CSRF, lote inválido, reenvio idempotente, leitura D1, cursor inválido e logout; seu registro temporário foi removido após validação.

Deploy autenticado: `npm run deploy`. Aplique antes as migrações necessárias com `npx wrangler d1 migrations apply jardim --remote`. O secret existente é preservado pelo Wrangler. CI valida pushes e PRs; deploy automático e previews ainda serão configurados. O deploy inicial foi feito pela API Cloudflare usando o mesmo bundle `dist/worker.js` e a migração SQL versionada. D1: `83d55918-db72-4dd4-8f5d-08d15df2c009` (ENAM).

Referência desta entrega: commit `feat: ship initial Jardim diary and password-protected Cloudflare deployment` (ver histórico Git). O roadmap completo abaixo continua sendo a fonte dos próximos passos.

## Sumário

- [Visão e princípios](#visão-e-princípios)
- [Experiências do produto](#experiências-do-produto)
- [Arquitetura](#arquitetura)
- [Monorepo e pacotes](#monorepo-e-pacotes)
- [Modelo de dados e contratos](#modelo-de-dados-e-contratos)
- [Sincronização local-first](#sincronização-local-first)
- [Captura e importação histórica](#captura-e-importação-histórica)
- [Integrações](#integrações)
- [Girassol UI](#girassol-ui)
- [Privacidade e segurança](#privacidade-e-segurança)
- [Build, testes e entrega](#build-testes-e-entrega)
- [Custos e observabilidade](#custos-e-observabilidade)
- [Roadmap e checklists](#roadmap-e-checklists)
- [Critérios de aceite](#critérios-de-aceite)
- [Decisões e questões abertas](#decisões-e-questões-abertas)

## Visão e princípios

O **Jardim** é uma combinação de diário, lifelog, álbum multimídia, catálogo cultural, grafo de conhecimento e mecanismo de recuperação de memórias. Deve responder perguntas como: *“O que fiz naquele dia?”*, *“Que vídeos salvei?”*, *“Que música acompanhou aquele mês?”* e *“O que aprendi sobre esse assunto?”*.

**Princípios:**

1. **Uma pessoa, vários dispositivos.** Não construir uma plataforma multi-tenant ou SaaS.
2. **Local-first.** A experiência principal funciona offline; a nuvem é o ponto durável de sincronização após confirmação.
3. **Captura respeitosa.** Metadados úteis, coleta configurável, privacidade por padrão; não coletar senhas, cookies, formulários ou DMs por padrão.
4. **Memória verificável.** Separar fatos observados, inferências e conteúdo gerado por IA; preservar fonte e precisão temporal.
5. **Dados portáveis.** Exportação, exclusão, backup e reconstrução de dispositivos.
6. **Integração sem acoplamento.** PhotoIntel permanece fonte de verdade para mídia já gerenciada por ele.
7. **Custo previsível.** Priorizar franquias Cloudflare, metadados e processamento sob demanda.
8. **Progressive enhancement.** Sem IA, o Jardim continua plenamente utilizável.

## Experiências do produto

### Timeline e card do dia

- [ ] Timeline por dia, semana, mês e ano; agrupamento por sessão e fonte.
- [ ] Cards de navegação, vídeos, músicas, fotos, interações, lugares e memórias.
- [ ] Card diário com fotos, destaques, diário, clima e trilha sonora.
- [ ] Temas climáticos (sol, chuva, nuvens, tempestade, neblina e noite) usando dados de clima persistidos.
- [ ] Registrar fuso horário, fonte, instante e tipo de dado meteorológico (previsão, observação, histórico).
- [ ] Navegação “Neste dia” e retrospectivas anuais.
- [ ] Busca textual, filtros, datas e busca em linguagem natural opcional.
- [ ] Grafo de entidades e relações com proveniência.

### Diário e mídia pessoal

- [ ] Entradas de texto, títulos, tags, referências e anexos.
- [ ] Notas de voz gravadas no navegador, com waveform e transcrição opcional.
- [ ] Vídeos curtos em formato circular, inspirados nas mensagens de vídeo de WhatsApp/Telegram.
- [ ] Captura via getUserMedia/MediaRecorder com fallback por suporte real do navegador, especialmente Safari iOS.
- [ ] Upload direto autorizado para R2, com pré-visualização, retry e retomada quando possível.
- [ ] Preservar arquivo original e gerar derivados somente quando necessário.
- [ ] Edição de memórias offline com revisões e resolução explícita de conflitos.
- [ ] Opções de visibilidade, exclusão, exportação e compartilhamento de cada memória.

### Cinema e séries

- [ ] Busca de filmes, séries, temporadas e episódios via TMDB.
- [ ] Estados: quero assistir, assistindo, concluído, abandonado e reassistido.
- [ ] Registrar data, plataforma opcional, avaliação pessoal e comentário.
- [ ] Acompanhamento de episódios e progresso por temporada.
- [ ] Estatísticas mensais e anuais.
- [ ] Links para IMDb; **não pressupor publicação automática** de ratings/reviews no IMDb sem API oficial autorizada.
- [ ] Avaliar sincronização de notas com TMDB conforme permissões e políticas disponíveis.
- [ ] Cache de metadados e atribuição adequada ao TMDB.

### Música, podcasts e álbuns

- [ ] OAuth Spotify com PKCE e escopos mínimos.
- [ ] Capturar músicas recentes, reprodução atual, artistas/faixas mais ouvidos e itens salvos conforme APIs permitidas.
- [ ] Cards de faixa, álbum, artista, podcast e episódio.
- [ ] Importar histórico exportado pelo Spotify e deduplicar com coleta contínua.
- [ ] Registrar lacunas: endpoints de músicas recentes não equivalem a histórico completo de podcasts.
- [ ] Estatísticas por dia, mês e ano, com cobertura e confiabilidade explicitadas.
- [ ] Respeitar regras de metadados, capas, playback e atribuição; não copiar áudio protegido.

### Cápsula do Jardim

- [ ] Retrospectiva mensal com músicas, filmes, séries, podcasts, fotos, vídeos, leituras, pessoas e memórias.
- [ ] Narrativa sugerida por IA, editável e sempre baseada em eventos documentados.
- [ ] Mostrar cobertura de fontes e meses com lacunas.
- [ ] Página interativa, cards compartilháveis e exportação PDF.
- [ ] Versão **selada** e imutável da cápsula, com edições revisadas separadas.
- [ ] Regeneração sob demanda sem destruir a versão anterior.
- [ ] Configurar quais fontes e memórias privadas podem entrar na cápsula.

### OG images e renderização de cards

- [ ] Serviço `@rodkisten/jardim-cards` com templates do Girassol.
- [ ] Formatos OG 1200×630, Story 1080×1920, quadrado 1080×1080 e feed 1080×1350.
- [ ] Avaliar Satori + Resvg em Workers; fallback para renderização externa quando necessário.
- [ ] Cache R2 por hash de conteúdo, template, versão e tema.
- [ ] Links compartilháveis com autorização explícita, revogação e proteção contra vazamento de dados privados.
- [ ] Pré-visualização e personalização de layouts.

## Arquitetura

```text
Safari iOS userscript ─┐
Chrome MV3 extension ──┤
Shortcuts / imports ───┼─> Capture SDK ─> Privacy filter ─> IndexedDB outbox
Jardim Web (Solid) ────┘                                 │
                                                        ▼
                                               Sync push / pull
                                                        │
                                              Cloudflare Worker API
                                               ├─ Prisma + D1
                                               ├─ R2 artifacts
                                               ├─ Async processing
                                               └─ Search / AI optional
                                                        │
                                           Other devices: Dexie + UI
```

**Frontend:** SolidJS 2 (RC, sujeito a compatibilidade), TypeScript strict, Vite, TanStack Router/Query/Virtual **apenas nas versões verificadas**, CSS Modules e Tailwind v4.

**Backend:** Cloudflare Workers, Prisma Client + `@prisma/adapter-d1` após prova de compatibilidade, D1, R2 e Queues quando necessário. Usar SQL parametrizado para FTS, migrações específicas e operações em lote quando o ORM não for adequado.

**Local:** Dexie/IndexedDB como fonte imediata da timeline; TanStack Query somente para consultas remotas, sem duplicar o banco local em caches concorrentes.

**Build:** pnpm workspaces + Turborepo; builds separados de SPA/PWA, Worker API, userscript IIFE e extensão Manifest V3.

**Busca:** D1/SQLite FTS quando suportado; embeddings/Vectorize e IA sob demanda, com limites de custo.

### Maturidade do Solid 2

Solid 2 está sendo avaliado em fase RC. Não considerar a compatibilidade com Kobalte, TanStack, compilador, editor, ícones ou tooling como garantida.

- [ ] Fixar versões exatas de `solid-js`, `@solidjs/web`, compilador e integrações.
- [ ] Criar prova de conceito Vite + Solid 2 + Router + Query + Dexie.
- [ ] Testar build, reatividade, stores, roteamento, UI no Safari iPhone e acessibilidade.
- [ ] Validar dependências headless; usar componentes próprios quando necessário.
- [ ] Manter domínio, captura e sincronização independentes de Solid.

## Monorepo e pacotes

Estrutura-alvo, **ainda não implementada**:

```text
jardim/
├── apps/
│   ├── web/                 # SPA/PWA Solid + Girassol
│   ├── api/                 # Cloudflare Worker
│   ├── userscript/          # IIFE universal para Safari/Tampermonkey
│   └── extension/           # Chrome MV3
├── packages/
│   ├── core/                # Domínio puro
│   ├── contracts/           # Zod, eventos e API
│   ├── sdk/                 # Cliente fetch agnóstico
│   ├── capture/             # Observadores e privacidade
│   ├── collectors/          # Registro de coletores
│   ├── sync/                # Protocolo e reconciliação
│   ├── local-db/            # Dexie e migrações
│   ├── database/            # Prisma + adaptador D1
│   ├── search/              # Busca híbrida
│   ├── cards/               # OG e cards
│   ├── atmosphere/          # Clima e temas
│   ├── media-recorder/      # Áudio e vídeo
│   ├── media-catalog/       # Cinema e séries
│   └── recap/               # Cápsulas
├── integrations/
│   ├── instagram/
│   ├── youtube/
│   ├── spotify/
│   ├── tmdb/
│   ├── open-meteo/
│   ├── github/
│   ├── photointel/
│   └── shortcuts/
├── tooling/
└── infra/cloudflare/
```

**Nomenclatura proposta:** `@rodkisten/jardim-core`, `@rodkisten/jardim-contracts`, `@rodkisten/jardim-sdk`, `@rodkisten/jardim-database`, `@rodkisten/jardim-cards`.

**Girassol** será idealmente um repositório independente com `@rodkisten/girassol` (componentes Solid), `@rodkisten/girassol-tokens` e, se necessário, `@rodkisten/girassol-icons`. Até sua criação, usar integração por pacote/versão definida, não copiar componentes de maneira descontrolada.

## Modelo de dados e contratos

Entidades centrais:

| Modelo | Propósito |
| --- | --- |
| `Event` | Acontecimento observado/importado, imutável ou com correções versionadas |
| `Entity` | Pessoa, mídia, página, projeto, lugar, filme, faixa etc. |
| `Session` | Agrupamento contextual de eventos |
| `Memory` | Registro pessoal editável com histórico de revisões |
| `Relation` | Vínculo tipado entre entidades/memórias |
| `Artifact` | Arquivo, áudio, vídeo, imagem ou referência externa |
| `DailyAtmosphere` | Clima e tema visual do dia |
| `Capsule` | Retrospectiva mensal e snapshots selados |
| `SyncChange` | Sequência de mudanças para replicação |
| `ImportJob` | Importação, origem, progresso e erros |

Campos fundamentais do evento: `id`, `schemaVersion`, `source`, `sourceEventId`, `deviceId`, `type`, `entityId`, `sessionId`, `occurredAt`, `observedAt`, `receivedAt`, `payload`, `privacy`, `confidence`, `provenance`. Não inventar `occurredAt` quando a exportação não trouxer a data.

Contratos HTTP propostos:

```text
POST   /v1/events/batch
GET    /v1/events
GET    /v1/timeline
GET    /v1/entities/:id
GET    /v1/search
POST   /v1/memories
PATCH  /v1/memories/:id
POST   /v1/sync/push
GET    /v1/sync/pull?cursor=...
GET    /v1/sync/bootstrap
GET    /v1/collectors
POST   /v1/imports
GET    /v1/imports/:id
POST   /v1/cards/render
GET    /v1/cards/:id/og.png
GET    /v1/cards/:id/story.png
GET    /v1/cards/:id/feed.png
```

- [ ] Definir schemas Zod e versionamento.
- [ ] Definir erros tipados, paginação e contratos OpenAPI gerados.
- [ ] Definir IDs estáveis e deduplicação por fonte.
- [ ] Definir políticas de retenção, tombstones e exclusão.
- [ ] Implementar Prisma schema e migrações D1.
- [ ] Validar importações em lote, FTS e índices.

## Sincronização local-first

1. A action valida o dado e grava **registro + operação outbox na mesma transação IndexedDB**.
2. A UI observa o estado local e responde imediatamente.
3. O sincronizador envia lotes com `operationId` idempotente, retries com backoff e jitter.
4. O servidor confirma cada operação e publica alterações com sequência monotônica.
5. Outros dispositivos fazem pull por cursor e aplicam mudanças e tombstones.
6. Bootstrap reconstrói um dispositivo do zero, respeitando permissões e retenção.

**Conflitos:** eventos append-only; preferências com versão; diário com revisões e resolução explícita; exclusões propagadas; mídias do PhotoIntel por referência. Não usar last-write-wins indiscriminadamente nem exigir CRDT no MVP.

**Safari iOS:** não depender de Background Sync para garantir entrega. Tentar sincronização ao abrir, retomar, alterar e durante atividade; tratar expurgo do IndexedDB e oferecer exportação/backup.

- [x] Outbox transacional e deduplicação.
- [x] Push idempotente com confirmação por item.
- [ ] Pull incremental por cursor, paginação e tombstones.
- [ ] Bootstrap de novo dispositivo.
- [ ] Resolução de conflito no diário.
- [ ] Retry/backoff, retomada e indicadores de pendências.
- [ ] Testes offline, rede intermitente, reenvio, concorrência e migrações.

## Captura e importação histórica

**Universal userscript:** TypeScript puro, observação de navegação SPA, atenção de leitura, progresso de vídeo, salvamentos e ações disponíveis. Observadores de DOM/rede apenas quando necessários e permitidos. IndexedDB, lote e filtros de privacidade. UI opcional via Shadow DOM/Girassol.

**Chrome MV3:** coletores compartilhados e `chrome.history` com permissão explícita; histórico local do Chrome **não é** histórico global da conta Google.

**Safari iOS:** userscripts não acessam o histórico global do Safari; registrar atividades observáveis enquanto ativos.

**Importadores:** ZIP/JSON/HTML com parser versionado, prévia, progresso, proveniência, reprocessamento e deduplicação.

### Instagram

- [ ] Capturar curtidas e descurtidas de mídia.
- [ ] Capturar salvos e remoção de salvos.
- [ ] Capturar reposts quando observáveis.
- [ ] Capturar novos seguidores a partir de notificações acessíveis, distinguindo **notificação observada** de **estado de seguimento confirmado**.
- [ ] Recuperar curtidas, salvos, conexões e demais dados disponíveis em exportações oficiais da Meta.
- [ ] Complementar lacunas com dados acessíveis na sessão web, sem coleta agressiva nem prometer histórico completo.
- [ ] Registrar IDs, links, criadores, timestamps e confiança; reconciliar importações e eventos ao vivo.
- [ ] Mostrar cobertura histórica e datas desconhecidas.

### Outras fontes

- [ ] YouTube: vídeos vistos, progresso, salvos e histórico importado quando disponível.
- [ ] X: posts vistos/salvos, listas e interações configuradas.
- [ ] Reddit: posts, comentários e conteúdo consumido conforme permissões.
- [ ] GitHub: commits, PRs, issues e atividades.
- [ ] Chrome: histórico local opt-in.
- [ ] Google Takeout: importadores incrementais por categoria.
- [ ] Shortcuts iOS: eventos manuais e automatizações autorizadas.
- [ ] PhotoIntel: fotos, datas originais, tags e referências seguras a mídia.

## Integrações

| Serviço | Papel | Limites e cuidados |
| --- | --- | --- |
| TMDB | Metadados de filmes/séries | Atribuição, cache e termos de API |
| IMDb | Link de títulos e publicação manual | Não presumir API pública de escrita de reviews |
| Spotify | Playback e biblioteca autorizados | OAuth, escopos, limites e lacunas em podcasts |
| Open-Meteo | Previsão e clima histórico | Licença, origem e precisão temporal |
| PhotoIntel | Catálogo de mídia existente | Não duplicar originais nem expor URLs privadas |
| Cloudflare R2 | Áudio, vídeo, exportações, cards | Upload autorizado e retenção |
| Workers AI/Vectorize | Busca semântica e resumos opcionais | Custos, privacidade e cobertura |

- [ ] Definir conectores com interfaces e erros padronizados.
- [ ] Registrar consentimento, escopos e revogação por fonte.
- [ ] Respeitar limites, termos, atribuições e cache de cada API.
- [ ] Fazer importação histórica sem sobrescrever registros confiáveis.

## Girassol UI

**Design system independente:** tokens de cores, tipografia, espaçamento, radii, elevação, motion e temas. Componentes Solid 2 acessíveis, CSS Modules + custom properties + Tailwind v4; Shadow DOM em userscripts.

**Componentes base:** Button, Input, Select, Combobox, Dialog, Sheet, Popover, Menu, Tabs, Toast, Tooltip, Card, Badge, Timeline, MediaCard, AudioPlayer, CircularVideo, WeatherCard, MonthCapsule, EmptyState, Skeleton, SyncStatus.

- [ ] Definir identidade visual e tokens do Girassol.
- [ ] Criar pacote separado e documentação visual.
- [ ] Validar acessibilidade, teclado, touch e VoiceOver.
- [ ] Suportar claro/escuro, contraste e movimento reduzido.
- [ ] Testar compatibilidade com Solid 2 RC.
- [ ] Criar templates reutilizáveis de OG e cards.
- [ ] Garantir isolamento CSS de interfaces injetadas.

## Privacidade e segurança

- [ ] Autenticação web com Cloudflare Access ou equivalente; tokens específicos por dispositivo para ingestão.
- [ ] Autorizações por domínio, coletor, tipo de evento e fonte.
- [ ] Filtros client-side e server-side; exclusões configuráveis.
- [ ] Nunca coletar credenciais, cookies, conteúdo de formulários ou DMs por padrão.
- [ ] Proteção contra vazamento de dados em OG images e links públicos.
- [ ] Uploads R2 assinados, controle de tipo/tamanho e URLs de leitura temporárias.
- [ ] Criptografia em trânsito; avaliar criptografia client-side para memórias sensíveis.
- [ ] Auditoria de captura, exportação, exclusão e revogação.
- [ ] Backup e restauração testados.
- [ ] Política explícita para dados pessoais de terceiros.

## Build, testes e entrega

- [ ] Inicializar pnpm workspaces + Turborepo + TS strict.
- [ ] Configurar ESLint, Prettier e verificações de tipos.
- [ ] Build Vite SPA/PWA com chunks por rota.
- [ ] Build userscript IIFE com metadata `@match`, `@run-at`, `@updateURL` e `@downloadURL`.
- [ ] Build Chrome MV3 com permissões mínimas.
- [ ] Build Worker API com bindings e ambiente local.
- [ ] Vitest unitário e de contratos.
- [ ] Testes de integração D1/Prisma e sync.
- [ ] Playwright E2E e testes manuais Safari iPhone.
- [ ] CI: lint → typecheck → unit → integration → build → e2e → preview → smoke → produção.
- [ ] Deploy com versionamento, rollback e migrações controladas.
- [ ] Sentry/logs sem conteúdo privado em payloads de erro.

## Custos e observabilidade

**Meta inicial:** manter custo incremental próximo de US$0–10/mês quando possível, com Workers Paid compartilhado se já contratado. Com IA e mídia, considerar orçamento indicativo de US$5–15/mês ou mais conforme uso; **não é garantia de preço**.

- [ ] Medir eventos/dia, bytes D1/R2, requisições e operações de fila.
- [ ] Limites configuráveis para IA, mídia e processamento.
- [ ] Painel de custo estimado por serviço.
- [ ] Alertas de orçamento e consumo anormal.
- [ ] Métricas de cobertura, falhas de importação e atraso de sync.
- [ ] Estratégia de retenção para thumbnails e derivados.

## Roadmap e checklists

> Marcar `[x]` **somente após implementação e validação**. Associar cada entrega a PR/commit e testes. Decisões já discutidas não contam como implementação.

### Fase 0 · Fundação

- [ ] Criar estrutura do monorepo e scripts de desenvolvimento.
- [ ] Validar Solid 2 RC + Vite + TanStack + Dexie.
- [ ] Validar Prisma + D1 adapter, migrações e Workers.
- [ ] Definir schemas, tipos e convenções.
- [ ] Preparar CI, testes, previews e ambientes.
- [ ] Iniciar Girassol independente.

### Fase 1 · Primeiro fluxo ponta a ponta

- [ ] Capturar um vídeo do YouTube no Safari.
- [ ] Persistir evento local e operação outbox.
- [ ] Sincronizar com Worker e D1 sem duplicatas.
- [ ] Fazer pull no desktop.
- [ ] Exibir vídeo na timeline e pesquisar.
- [ ] Validar offline, retry e reinstalação de dispositivo.

### Fase 2 · Jardim pessoal

- [ ] Diário e memórias com anexos.
- [ ] Notas de voz e vídeos circulares.
- [ ] Integração PhotoIntel.
- [ ] Card do dia com clima.
- [ ] Busca textual e filtros.

### Fase 3 · Fontes e histórico

- [ ] Instagram contínuo + ZIP Meta.
- [ ] YouTube/Google Takeout.
- [ ] Chrome MV3 e histórico autorizado.
- [ ] GitHub, X, Reddit e Shortcuts.
- [ ] Painel de cobertura e qualidade dos dados.

### Fase 4 · Cultura e música

- [ ] TMDB: filmes, séries, episódios, notas e comentários.
- [ ] Spotify: OAuth, histórico, biblioteca, podcasts e importação.
- [ ] Estatísticas culturais e musicais.
- [ ] Cards culturais e compartilhamento autorizado.

### Fase 5 · Cápsulas e inteligência

- [ ] Cápsula mensal interativa.
- [ ] OG images, Stories, feed e PDF.
- [ ] Cápsulas seladas e revisões.
- [ ] Busca semântica e grafo.
- [ ] Resumos assistidos por IA com proveniência.

### Fase 6 · Robustez

- [ ] Backup/restauração e exportação integral.
- [ ] Auditoria de privacidade e segurança.
- [ ] Otimização de custos e desempenho.
- [ ] Testes de longa duração e recuperação de falhas.
- [ ] Documentação operacional e manutenção.

## Critérios de aceite

**Um recurso só é concluído quando:**

1. Funciona no cenário principal e tem tratamento de erros.
2. Possui testes proporcionais ao risco, executados com sucesso.
3. Não quebra o fluxo offline nem duplica eventos em retry.
4. Respeita privacidade, proveniência e permissões.
5. Tem documentação e checkboxes atualizados.
6. Quando aplicável, foi testado em Safari iPhone e Chrome desktop.
7. O build/CI passa; commits e PRs são rastreáveis.

**Critério do primeiro MVP:** capturar um vídeo observado no Safari, fechar a página antes de sincronizar, recuperar a conexão, confirmar a ingestão idempotente e encontrá-lo na timeline de outro dispositivo.

## Decisões e questões abertas

### Direções escolhidas

- Nome do produto: **Jardim**.
- Design system: **Girassol**, idealmente independente.
- Arquitetura: **SPA local-first**.
- Frontend: **Solid 2 + Vite**, condicionado à prova de compatibilidade do RC.
- Banco remoto: **Cloudflare D1 com Prisma**, condicionado à prova de compatibilidade.
- Banco local: **Dexie/IndexedDB**.
- Mídia: **R2**; integração com **PhotoIntel**.
- SDK de captura: **TypeScript puro**, sem dependência de Solid.
- Modelo de produto: **single-user**.

### A validar

- [ ] Versões exatas e compatibilidade de Solid 2, TanStack e bibliotecas UI.
- [ ] Fluxo Prisma Migrate/D1 em desenvolvimento, CI e produção.
- [x] Hospedagem e domínio definitivos.
- [ ] Política de retenção de mídia e orçamento de IA.
- [ ] Escopos e permissões efetivamente disponíveis em Spotify/TMDB/Meta.
- [ ] Repositório, publicação e versionamento independentes do Girassol.
- [ ] Formatos de backup, importação e exportação.
- [ ] Regras de compartilhamento público e revogação de cards.

---

**Manutenção deste README:** toda alteração de escopo deve atualizar as seções correspondentes; cada funcionalidade concluída deve marcar seu checkbox, registrar referência de PR/commit e indicar a validação executada. Não marcar itens com base apenas em intenção, código não testado ou pipelines falhas.
