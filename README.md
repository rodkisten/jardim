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

### Fundação · monorepo e banco remoto

O gerenciador é **pnpm 10.28.2**, fixado em `packageManager`. Use Node 24.11+ (linha 24), `corepack pnpm install --frozen-lockfile` e `pnpm check`. `pnpm-lock.yaml` é o lockfile único. Os pacotes `jardim-web`, `jardim-api`, `jardim-contracts`, `jardim-local-db` e `jardim-database` declaram suas dependências e exports. Turborepo ordena contratos/banco local/geração Prisma → web → API. O build está sem cache de tarefas nesta etapa, pois web e API ainda compartilham artefatos; isso evita restaurar saídas incompletas. O preview fixo de QA usa banco e bucket separados; previews automáticos por PR e separação definitiva desses artefatos permanecem pendentes.

ESLint e Prettier são verificações obrigatórias. TypeScript está fixado em **6.0.3**, versão suportada pelo parser do ESLint; a combinação anterior com TypeScript 7 é incompatível com esse parser e não teve os peers ignorados. `pnpm check` executa formatação → lint → builds do monorepo → tipos Wrangler → TypeScript strict → Vitest. A CI instala com lockfile congelado e executa o mesmo comando. `pnpm dev` inicia a SPA; `pnpm dev:api` inicia o Worker HTTPS local.

**Prisma 7.10.1**, Client e `@prisma/adapter-d1` usam a mesma versão. `packages/database/prisma/schema.prisma` mapeia as tabelas já existentes. Timestamps ISO e tags JSON continuam texto; expiração de sessão usa BigInt para comportar milissegundos. Clientes são criados por consulta e desconectados no `finally`. As leituras de sessão e confirmação passam pelo ORM; escrita em lote, contagem de tentativas e cursor `rowid` permanecem SQL parametrizado, preservando atomicidade e compatibilidade de sincronização.

**Migrações:** `0001_foundation.sql` permanece imutável. O mapeamento inicial preserva as tabelas existentes; a captura usa apenas a migração aditiva `0002_capture.sql`. `pnpm db:generate` gera o cliente e `pnpm db:validate` valida o schema. Aplique migrações locais com `pnpm db:migrate:local` e remotas com `pnpm db:migrate:remote`. Para uma mudança futura, compare o schema anterior com o novo usando `pnpm exec prisma migrate diff --from-schema <schema-anterior> --to-schema packages/database/prisma/schema.prisma --script`; revise o SQL e acrescente uma nova migração numerada em `infra/cloudflare/migrations`. Nunca aplique uma recriação inicial, `db push` ou reset no banco de produção.

Testes em `tests/database.test.ts` usam o Client e adaptador D1 reais sobre SQLite, após executar a migração existente, verificando IDs, conteúdo, `rowid`, recibos e expiração BigInt. `tests/api.test.ts` integra esses caminhos no Worker. Referência: commit `feat: add private YouTube capture and offline application shell`.

### Continuação · sincronização e regras de código

- [x] Sincronização envia todas as pendências, divididas em até 50 operações e 512 KiB por lote (UTF-8).
- [x] Confirmações e páginas validadas por schemas; confirmações desconhecidas nunca apagam trabalho local.
- [x] Chamadas simultâneas na mesma aba compartilham a sincronização; respostas atrasadas não fazem o cursor retroceder entre abas.
- [x] Bootstrap paginado de um dispositivo novo via `/v1/sync/bootstrap`, seguido de `/v1/sync/pull`; `/v1/memories` continua compatível.
- [x] Retry automático com backoff exponencial e jitter até cinco minutos, timeout de 20 segundos por resposta completa e limite de tamanho de resposta. O botão Atualizar permite uma tentativa manual imediata. O disparador periódico continua a cada 30 segundos, respeitando o prazo do backoff.
- [x] Comentários explicam regras de persistência, idempotência, segurança e compatibilidade. `AGENTS.md` exige mantê-los ao alterar comportamento.

Validação: `tests/sync.test.ts` cobre fila de 123 operações, Unicode, confirmações inválidas/parciais, bootstrap com 135 memórias, chamadas simultâneas, avanço concorrente de cursor, paginação inválida, backoff, tamanho de resposta e timeout. `tests/api.test.ts` verifica as novas rotas com autenticação e SQL real em SQLite. Essa entrega inicial foi ampliada pela sincronização `/v2`, documentada abaixo. Referência: commit `feat: harden multi-device sync and document important invariants`.

### Continuação · captura privada e PWA · 13/11/2026

- [x] Userscript YouTube compilado em IIFE para Safari 16+, com metadata de instalação/atualização e distribuição em `/downloads/jardim-youtube.user.js`.
- [x] Captura opt-in de páginas de vídeo/Shorts observadas, com título, instante observado e URL canônica. Parâmetros de busca, playlists, credenciais e cookies não são capturados.
- [x] Fila GM persistente por evento, preservada ao fechar a página e independente entre abas; lotes de 25, timeout, backoff e confirmação estrita antes de remover pendências.
- [x] Gestão de dispositivos na interface Solid: criar token de envio exibido uma vez, listar e revogar. O servidor armazena somente seu hash; o token não permite ler o diário.
- [x] Ingestão idempotente em transação D1, proveniência em `capture_events` e projeção do vídeo na timeline existente. Reenvios não substituem o primeiro registro.
- [x] Cards com link canônico para abrir o YouTube e componente Solid com CSS Module.
- [x] Shell PWA, manifest e ícone; cache restrito à aplicação autenticada e assets. API, formulários de login e tokens não entram no Cache Storage; logout limpa o shell.

**Produção:** bundle JS e módulo Wasm publicados em `jardim.migos.club`; migração `0002_capture.sql` aplicada e registrada em `d1_migrations`, junto da fundação existente. Smoke HTTP remoto validou instalador público, service worker, login, shell autenticado, bootstrap pelo Prisma/D1 real, criação/revogação de token e logout. Nenhuma memória foi inserida por esse smoke; o dispositivo temporário foi removido. `wrangler deploy --dry-run` passou. A CI ganhou um job Chromium E2E com Worker/D1 locais; a versão inicial foi validada na execução GitHub Actions `43446110010`, com check e E2E concluídos com sucesso; os novos cenários exigem a CI do commit atual.

**Como usar:** entre no Jardim, abra **Dispositivos e captura do YouTube**, instale o userscript e crie um token. No menu do Tampermonkey, escolha **Jardim · conectar dispositivo**. A captura começa somente após conectar; o menu permite pausar ou consultar/reenviar a fila. Mantenha o userscript habilitado para retomar envios na próxima visita. Não há sincronização em segundo plano depois de encerrar o navegador.

A migração aditiva `0002_capture.sql` cria dispositivos e proveniência, preservando a tabela de memórias e seus cursores. Eventos capturados são projetados como memórias para compatibilidade com dispositivos antigos. O contrato genérico de eventos e outras fontes continuam no roadmap; edição e conflitos são tratados pela sincronização `/v2` descrita abaixo.

**Validação automatizada:** `tests/capture.test.ts` verifica escopo do token, revogação, CSRF, idempotência, proveniência e pull; `tests/userscript.test.ts` executa o IIFE real, simulando página fechada, duas abas e confirmações falsas; `tests/pwa.test.ts` executa o service worker gerado e verifica autenticação do shell, fallback offline, exclusão de APIs do cache e limpeza no logout. Esses testes não substituem a instalação real no Safari iPhone. Referência: commit `feat: add private YouTube capture and offline application shell`.

### Continuação · diário multimídia, Girassol e tema escuro

Implementação de referência: commit `feat: ship editable multimedia diary with dark mode and private capsules`.

- [x] Editar memórias offline e mover para a lixeira, mantendo revisões e permitindo restauração.
- [x] Sincronização `/v2`: sequência independente monotônica, compare-and-swap por revisão, recibos idempotentes e resolução explícita de conflitos entre dispositivos.
- [x] Uma edição feita durante o envio anterior permanece na fila; uma resposta perdida não aplica a mesma alteração duas vezes.
- [x] Importar o JSON exportado pelo Jardim com IDs preservados, transação atômica e conflitos para versões remotas diferentes. Dados locais e exclusões conhecidas nunca são sobrescritos por um backup antigo.
- [x] Fotos, áudio e vídeo originais em R2 privado; até cinco anexos por memória e 12 MiB por arquivo. IndexedDB guarda memória, bytes e fila na mesma transação; envio é retomado na próxima conexão.
- [x] Gravação de voz e vídeo circular de até 30 segundos, escolhendo MIME por `MediaRecorder.isTypeSupported`, com tratamento de permissão e fallback por seleção de arquivo.
- [x] Upload autenticado e imutável por UUID/hash; leitura protegida e respostas de byte range para reprodução de mídia.
- [x] Busca textual com filtros por dia e fonte.
- [x] Card do dia com cidade escolhida explicitamente e salva, previsão diária Open-Meteo no fuso da cidade, mínima/máxima, condição e chance de chuva, com persistência opcional como memória.
- [x] Pacote `@rodkisten/girassol` separado do domínio do Jardim, com Button, Input, Card, Badge, CSS Modules, tokens e galeria visual.
- [x] Tema **Sistema / Claro / Escuro**, com troca no cabeçalho e login, preferência por dispositivo, atualização entre abas e aplicação antes da primeira pintura. A aplicação continua utilizável se o armazenamento de preferências estiver bloqueado.
- [x] Registros culturais manuais: filme/série, estado, data da experiência, nota, comentário, temporada e episódio; link de busca IMDb com publicação manual.
- [x] Importação JSON do histórico estendido do Spotify, com IDs determinísticos e sem inventar datas sem fuso.
- [x] Cápsulas mensais com seleção de memórias e narrativa escrita pelo usuário, snapshots privados imutáveis, fila offline e novas versões sem substituir as anteriores.
- [x] `@rodkisten/jardim-cards`: SVG seguro e PNG no navegador nos formatos OG 1200×630, Story 1080×1920, quadrado 1080×1080 e feed 1080×1350. O endpoint SVG exige autenticação; não há link público automático.
- [x] Impressão da cápsula aberta com opção de salvar PDF pelo navegador.

**Conectores implementados, com ativação externa pendente:** Spotify usa OAuth PKCE com estado de uso único, escopo `user-read-recently-played`, renovação de token e armazenamento AES-GCM com chave independente da senha do Jardim. A coleta atual cobre até 50 músicas recentes por consulta, não o histórico completo nem toda a biblioteca/podcasts. TMDB possui busca autenticada de filmes e séries. Testes usam respostas controladas; o fluxo real depende das credenciais abaixo e não é marcado como validado em produção.

**Configuração de integrações:** configure o Client ID na interface, em **Cultura, Spotify e conexões → Configurar aplicação Spotify**; a variável pública `SPOTIFY_CLIENT_ID` continua disponível como alternativa para uma aplicação registrada no Spotify; cadastre `https://jardim.migos.club/v2/spotify/callback` como redirect URI. `INTEGRATION_KEY` é um secret de 32 bytes em hexadecimal usado para criptografar tokens. `TMDB_TOKEN` é o API Read Access Token, também secret. Nunca coloque tokens nos arquivos versionados ou no JavaScript do navegador. Sem a configuração, os controles indicam a pendência e o diário/importadores manuais continuam disponíveis. Desconectar Spotify remove os tokens locais; a revogação completa pode ser feita no painel da conta Spotify. Não há envio de áudio protegido, nem análise de dados Spotify por IA.

**Migrações:** `0003_revisions.sql` preserva a tabela e os rowids antigos, acrescenta versões, lixeira, journal monotônico e recibos; `0004_capsules.sql` guarda snapshots imutáveis; `0005_integrations.sql` acrescenta credenciais criptografadas, estados OAuth e proveniência. `tests/migrations.test.ts` executa a atualização sobre uma memória preexistente e confere conteúdo, ID, rowid e histórico inicial. A criação legada `/v1` continua disponível para o capturador; recarregue clientes antigos para usar edição e exclusão via `/v2`.

**Verificação:** `pnpm check` exige formatação, lint, builds, tipos e testes. Integrações SQLite cobrem conflitos, edição em voo, retry, restauração, lixeira, mídia, cápsulas e credenciais. O job Chromium usa apenas arquivos e dispositivos de mídia sintéticos, testando dois contextos, offline, tema escuro, edição, R2 local, captura, gravação, cápsula, PNG e backup. Safari iPhone, câmera e VoiceOver reais continuam exigindo teste em dispositivo; Chromium não substitui essa validação.

**Ambiente de QA:** https://qa-jardim.kisten.workers.dev usa o Preview `qa` do Worker, D1 `jardim-preview-qa` e bucket privado `jardim-preview-qa`. As migrações foram aplicadas nesse banco vazio, sem copiar memórias ou credenciais de integrações da produção. O acesso mantém a proteção por senha. Esse ambiente fixo não substitui a automação de previews por PR.

**Rascunhos e verificação remota:** campos de título do diário, cultura e cápsulas preservam a edição em atualizações reativas. O teste do bundle compilado verifica essa preservação. `tests/remote-smoke.py` valida a implantação com leituras autenticadas, sem criar ou remover memórias; usa a senha exclusivamente de um arquivo local ignorado pelo Git.

**Publicação · 14/11/2026:** código `835f95d968ca9ff92f2b522f28c6973b03376d8b` publicado em https://jardim.migos.club após [CI 43538231161](https://github.com/rodkisten/jardim/actions/runs/43538231161) concluir `check` e `e2e` com sucesso. Foram 38 testes locais em 15 arquivos, mais o fluxo Chromium completo: tema persistido, offline com recarga, dois dispositivos, edição/lixeira, upload e byte range, gravação sintética, registro cultural, cápsula sincronizada, PNG 1200×630, backup e logout. O upload inclui o Wasm Prisma e o binding R2 privado; a senha foi preservada. Migrações 0003–0005 foram aplicadas e registradas, preservando a memória preexistente. A validação HTTP do QA passou sem escrita em memórias.

### Continuação · navegação temporal

- [x] Visões Tudo, Dia, Semana, Mês, Ano e Neste dia, com busca e fonte combinadas.
- [x] Semana de segunda a domingo; navegação anterior/próximo por período e retorno para Hoje.
- [x] Agrupar por dia ou fonte: Diário, YouTube, Spotify, Cultura e Clima. A classificação usa as tags dos registros; não implica autenticação ou cobertura completa da fonte.
- [x] Datas calculadas no fuso IANA do dispositivo, indicado na interface. Registros próximos da meia-noite respeitam esse fuso; os instantes originais permanecem intactos.
- [x] “Neste dia” mostra somente anos anteriores ao dia de referência; 29 de fevereiro não é convertido em outra data.
- [x] Contagem do resultado versus total disponível e indicação de limites de cobertura local, sem confundir filtro vazio com diário vazio.

As opções ficam em uma grade de duas colunas para celular, com navegação acessível por nome e botões de pelo menos 44 px. O filtro é local e funciona offline. Trocar o fuso do dispositivo pode mudar o agrupamento; ainda não há um fuso histórico por memória. Não houve mudança de schema ou migração nesta etapa.

Validação: `tests/timeline.test.ts` cobre fuso, limites da semana entre anos, fontes, busca, aniversários, ano bissexto, navegação de fim de mês e ordenação de instantes com precisão fracionária. O Chromium verifica períodos e agrupamento por fonte com uma lembrança sintética de outro ano em D1 local.

### Continuação · visual, mensagens e clima diário

Referência de direção visual: https://githubnext.com/. Girassol passa a usar superfícies neutras, tipografia sans, cards com campos suaves de cor rosa/azul/coral/violeta, estados claros e escuros e movimentos curtos com respeito a `prefers-reduced-motion`. A fonte Mona Sans de GitHub é distribuída localmente, sob SIL Open Font License (`apps/web/src/assets/MonaSans-OFL.txt`); não há requisição a um provedor de fontes. O ícone PWA e os cards de cápsulas acompanham a paleta. A interface não usa metáforas botânicas ou verde obrigatório.

- [x] Editor recolhido por padrão, aberto por **Nova memória** em diálogo modal, com foco e fechamento nativos. Fechar preserva o rascunho durante a sessão; salvar fecha o editor. Ao fechar durante captura, câmera e microfone são liberados e a gravação em andamento é descartada.
- [x] Memórias somente com mídia, sem obrigar título/texto: o título é preenchido conforme o anexo. Fotos/áudio/vídeo têm prévia antes de salvar.
- [x] Áudio com forma de onda derivada das amostras reais, reprodução/pausa, busca e velocidades 1×/1,5×/2×. A decodificação é iniciada quando o player entra na área visível; formato sem suporte indica indisponibilidade, sem simular barras.
- [x] Medidor de frequências reais do microfone durante captura, contador, pausa/retomada e descarte. Gravações limitadas a 30 segundos ativos e 12 MiB; limite de cinco anexos preservado.
- [x] Mensagens de vídeo circulares com câmera frontal/traseira escolhida antes de gravar, prévia, anel de progresso, reprodução por toque, busca, velocidade e opção de ampliar/recolher. Um player pausa os demais ao iniciar.
- [x] Cidade salva na conta e no dispositivo; última previsão disponível offline e atualização automática ao retornar/reconectar/mudar de dia. Sem localização automática. Memória antiga de clima com coordenadas pode recuperar a cidade durante atualização.
- [x] Previsão **do dia**, com data e fuso da cidade, mínima/máxima, condição e probabilidade máxima de chuva. É previsão modelada, não medição de estação; uma previsão de outro dia é identificada como antiga.
- [x] Configuração Spotify na interface, endereço de retorno copiável, indicação de configuração ausente e mensagens para autorização cancelada ou troca de token malsucedida. Trocar a aplicação invalida estados OAuth e tokens anteriores.

**Spotify em produção:** a investigação encontrou ausência de Client ID. Ainda é necessário registrar/usar uma aplicação própria no Spotify for Developers, cadastrar o endereço de retorno exibido e informar seu Client ID na interface. O fluxo usa PKCE, sem solicitar Client Secret. A autorização real e os limites de desenvolvimento dependem da conta/aplicação Spotify; a configuração guiada não é uma alegação de conexão já autorizada.

**Dados:** migração aditiva `0006_preferences.sql` cria apenas preferências validadas, sem alterar memórias ou mídia. Tokens OAuth continuam criptografados em tabela separada. A preferência de cidade é retomada offline e sincronizada ao reconectar. O rascunho do editor é preservado ao fechar/abrir na mesma sessão, sem promessa de persistência após recarga.

**Validação:** testes medem picos reais/silêncio, preferências e troca de aplicação, previsão diária com origem fixa e preservação das memórias na migração. Chromium cobre editor fechado/rascunho, cidade após recarga, waveform de áudio sintético, captura com pausa/retomada, vídeo circular e início PKCE. Safari iPhone, permissões reais e codecs específicos continuam precisando de validação em dispositivo.

### Limites atuais

A exportação JSON contém as memórias presentes no dispositivo; **não é backup integral** de anexos, lixeira, histórico de revisões, tokens ou cápsulas. A exclusão é lógica, com conteúdo recuperável na lixeira; apagamento permanente e retenção de objetos órfãos ainda precisam de implementação. Upload é limitado e intermediado pelo Worker; upload multipart direto/assinado com retomada de partes permanece pendente.

PhotoIntel, coletores adicionais/Takeout/Meta, catálogo cultural completo com progresso derivado, biblioteca completa Spotify, busca semântica/grafo, IA, alertas de custo e compartilhamento público revogável continuam no roadmap. Girassol tem pacote próprio no monorepo, sem publicação npm ou repositório externo independente. O PDF é gerado pelo fluxo de impressão do navegador, não por serviço de renderização em background.

O preset Solid 2 disponível e o runtime RC atual divergem no mecanismo interno de eventos delegados. A compilação usa `delegateEvents: false`; o teste `tests/ui.test.ts` verifica salvar e buscar usando o bundle real. TanStack permanece sem validação e não foi introduzido.

Os pequenos assets iniciais são empacotados com o Worker para uma publicação única e proteção uniforme; `tooling/assets.mjs` gera o mapa antes do bundle. Reavaliar Workers Static Assets ao crescer. Nenhum segredo é incorporado ao JavaScript do navegador.

### Formatação obrigatória

Prettier é o formatador do repositório, com configuração versionada. Execute `pnpm format` em toda alteração antes de concluir o trabalho ou criar commits. Os comandos `dev`, `build` e `test` executam a formatação automaticamente. `pnpm format:check` valida sem modificar arquivos e é a primeira etapa de `pnpm check` na CI. Artefatos gerados, dependências e arquivos locais de credenciais ficam excluídos.

### Desenvolvimento e verificações

```bash
corepack pnpm install --frozen-lockfile
pnpm build
pnpm exec wrangler types
pnpm check
cp .dev.vars.example .dev.vars
# Defina uma senha de desenvolvimento em .dev.vars.
pnpm exec wrangler d1 migrations apply jardim --local
pnpm exec wrangler dev --local-protocol https
```

`pnpm check` executa build, TypeScript strict e Vitest. Os testes cobrem contratos, persistência, reenvio, confirmação parcial, cursor inválido, tamanho de requisição, autenticação, CSRF, SQL/migração SQLite, idempotência, logout, tentativas de login e UI Solid compilada. O teste SQLite usa o SQL real do Worker e o adaptador Prisma/D1 real. A validação remota do Worker continua necessária para conferir bindings e compatibilidade do runtime.

`tests/browser.mjs` contém o cenário Chromium de ponta a ponta; requer Chromium executável (`CHROMIUM_PATH`, ou `/usr/bin/chromium`) e servidor HTTPS local. O executor local inicialmente bloqueou o Chromium por `socket() failed: Operation not permitted`; a CI executou o cenário Chromium inicial com sucesso. **Não declarar Safari iPhone concluído** com base nesse resultado. A tela de entrada em produção foi inspecionada visualmente. O smoke HTTP remoto passou em login, senha incorreta, cookie seguro, SPA protegida, CSRF, lote inválido, reenvio idempotente, leitura D1, cursor inválido e logout; seu registro temporário foi removido após validação.

Deploy autenticado: `pnpm deploy`. Aplique antes as migrações necessárias com `pnpm exec wrangler d1 migrations apply jardim --remote`. O secret existente é preservado pelo Wrangler. CI valida pushes e PRs; deploy automático e previews ainda serão configurados. O deploy inicial foi feito pela API Cloudflare usando o mesmo bundle `dist/worker.js` e a migração SQL versionada. D1: `83d55918-db72-4dd4-8f5d-08d15df2c009` (ENAM).

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

O **Jardim** é uma combinação de diário, lifelog, álbum multimídia, catálogo cultural, grafo de conhecimento e mecanismo de recuperação de memórias. Deve responder perguntas como: _“O que fiz naquele dia?”_, _“Que vídeos salvei?”_, _“Que música acompanhou aquele mês?”_ e _“O que aprendi sobre esse assunto?”_.

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

- [x] Timeline por dia, semana, mês e ano; agrupamento por dia e fonte.
- [ ] Agrupamento por sessão de atividade.
- [ ] Cards de navegação, vídeos, músicas, fotos, interações, lugares e memórias.
- [ ] Card diário com fotos, destaques, diário, clima e trilha sonora.
- [ ] Temas climáticos (sol, chuva, nuvens, tempestade, neblina e noite) usando dados de clima persistidos.
- [ ] Registrar fuso horário, fonte, instante e tipo de dado meteorológico (previsão, observação, histórico).
- [x] Navegação “Neste dia” com datas documentadas em anos anteriores.
- [ ] Retrospectivas anuais com narrativa e estatísticas.
- [x] Busca textual combinada com período, datas e fonte.
- [ ] Busca em linguagem natural opcional.
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

Estrutura-alvo, **parcialmente implementada**: web, API, userscript, contratos, banco local, banco remoto e captura já existem; os demais módulos continuam no roadmap:

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

| Modelo            | Propósito                                                                |
| ----------------- | ------------------------------------------------------------------------ |
| `Event`           | Acontecimento observado/importado, imutável ou com correções versionadas |
| `Entity`          | Pessoa, mídia, página, projeto, lugar, filme, faixa etc.                 |
| `Session`         | Agrupamento contextual de eventos                                        |
| `Memory`          | Registro pessoal editável com histórico de revisões                      |
| `Relation`        | Vínculo tipado entre entidades/memórias                                  |
| `Artifact`        | Arquivo, áudio, vídeo, imagem ou referência externa                      |
| `DailyAtmosphere` | Clima e tema visual do dia                                               |
| `Capsule`         | Retrospectiva mensal e snapshots selados                                 |
| `SyncChange`      | Sequência de mudanças para replicação                                    |
| `ImportJob`       | Importação, origem, progresso e erros                                    |

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
- [x] Bootstrap de novo dispositivo.
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

| Serviço              | Papel                               | Limites e cuidados                             |
| -------------------- | ----------------------------------- | ---------------------------------------------- |
| TMDB                 | Metadados de filmes/séries          | Atribuição, cache e termos de API              |
| IMDb                 | Link de títulos e publicação manual | Não presumir API pública de escrita de reviews |
| Spotify              | Playback e biblioteca autorizados   | OAuth, escopos, limites e lacunas em podcasts  |
| Open-Meteo           | Previsão e clima histórico          | Licença, origem e precisão temporal            |
| PhotoIntel           | Catálogo de mídia existente         | Não duplicar originais nem expor URLs privadas |
| Cloudflare R2        | Áudio, vídeo, exportações, cards    | Upload autorizado e retenção                   |
| Workers AI/Vectorize | Busca semântica e resumos opcionais | Custos, privacidade e cobertura                |

- [ ] Definir conectores com interfaces e erros padronizados.
- [ ] Registrar consentimento, escopos e revogação por fonte.
- [ ] Respeitar limites, termos, atribuições e cache de cada API.
- [ ] Fazer importação histórica sem sobrescrever registros confiáveis.

## Girassol UI

**Design system independente:** tokens de cores, tipografia, espaçamento, radii, elevação, motion e temas. Componentes Solid 2 acessíveis, CSS Modules + custom properties + Tailwind v4; Shadow DOM em userscripts.

**Componentes base:** Button, Input, Select, Combobox, Dialog, Sheet, Popover, Menu, Tabs, Toast, Tooltip, Card, Badge, Timeline, MediaCard, AudioPlayer, CircularVideo, WeatherCard, MonthCapsule, EmptyState, Skeleton, SyncStatus.

- [ ] Definir identidade visual e tokens do Girassol.
- [x] Criar pacote separado e documentação visual no monorepo.
- [ ] Validar acessibilidade, teclado, touch e VoiceOver.
- [x] Suportar claro/escuro/sistema, tokens de contraste, foco visível e movimento reduzido; VoiceOver real permanece pendente.
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
- [x] Configurar ESLint, Prettier e verificações de tipos.
- [ ] Build Vite SPA/PWA com chunks por rota.
- [x] Build userscript IIFE com metadata `@match`, `@run-at`, `@updateURL` e `@downloadURL`.
- [ ] Build Chrome MV3 com permissões mínimas.
- [ ] Build Worker API com bindings e ambiente local.
- [x] Vitest unitário e de contratos.
- [x] Testes de integração D1/Prisma e sync em SQLite, com adaptador real.
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

- [x] Criar estrutura do monorepo e scripts de desenvolvimento.
- [ ] Validar Solid 2 RC + Vite + TanStack + Dexie.
- [x] Validar Prisma + D1 adapter e preservação de migrações em integração SQLite; smoke remoto descrito acima.
- [ ] Definir schemas, tipos e convenções.
- [ ] Preparar CI, testes, previews e ambientes.
- [x] Iniciar Girassol como pacote independente do domínio, com galeria integrada.

### Fase 1 · Primeiro fluxo ponta a ponta

- [ ] Capturar um vídeo do YouTube no Safari.
- [x] Persistir evento local e operação outbox no userscript YouTube.
- [x] Sincronizar com Worker e D1 sem duplicatas (testes de integração e reenvio).
- [ ] Fazer pull no desktop.
- [x] Exibir vídeo na timeline e pesquisar pelo título, URL e tags.
- [ ] Validar offline, retry e reinstalação de dispositivo.

### Fase 2 · Jardim pessoal

- [x] Diário e memórias com anexos, edição, lixeira e revisões.
- [ ] Notas de voz e vídeos circulares.
- [ ] Integração PhotoIntel.
- [x] Card do dia com clima escolhido pelo usuário e proveniência persistida.
- [x] Busca textual e filtros por dia e fonte.

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

- [x] Cápsula mensal interativa, privada e baseada nos registros locais selecionados.
- [ ] OG images, Stories, feed e PDF.
- [x] Cápsulas seladas e novas versões privadas sem sobrescrita.
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
