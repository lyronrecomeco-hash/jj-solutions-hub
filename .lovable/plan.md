## Plano de Execução — Ajustes Finais JJ Informática

Vou dividir em blocos por prioridade. Tudo será feito sem quebrar o que já funciona.

---

### 1. Solicitar Cadastro (`/solicitar-cadastro`)
- **Responsividade mobile**: refatorar o StepBar para versão compacta no mobile (dots numerados + título do passo atual em vez de barra horizontal completa).
- **Placeholders nos inputs** com opacidade baixa, estilo dev:
  - Nome → `Ex: Pedro`
  - Sobrenome → `Ex: Martins`
  - E-mail → `seuemail@gmail.com`
  - Senha → `••••••••`
  - CPF → `000.000.000-00`, RG → `00.000.000-0`, Telefone → `(00) 00000-0000`, etc.
- **Validações do PDF**:
  - CPF com algoritmo de dígito verificador
  - RG formato válido
  - Idade ≥ 18 (calculada da data de nascimento)
  - Mensagens de erro inline

---

### 2. Mapa (Monitoramento + Modal de Rastreio)
- **Remover marca d'água** "Leaflet | © CARTO © OpenStreetMap" (configurar `attributionControl={false}` e atribuição mínima discreta no rodapé).
- **Suporte a tema claro/escuro automático**:
  - Light: `voyager` (CARTO) — ruas nítidas e legíveis
  - Dark: `dark_all` (CARTO) — combina com modo escuro do painel
  - Detecta via `useTheme()` e troca tiles dinamicamente
- **Qualidade premium**: maxZoom 20, retina tiles (`@2x`), labels separados por cima.
- **Modal de Rastreio (revisão do que foi pedido antes)**:
  - Painel lateral esquerdo com: foto/avatar do técnico, nome, endereço textual (reverse geocoding), velocidade, precisão, última atualização "há X segundos" ao vivo
  - Mapa à direita ocupando 60-65%
  - Atualização em tempo real por segundo (já temos `watchPosition`, garantir que o marker se move com animação suave `flyTo`)
  - Botão "Centralizar" e "Abrir no Google Maps"

---

### 3. Crachá Digital (bug crítico)
- **Corrigir bug visual do modal** (overflow/scroll mostrado no print) — ajustar altura do wrapper 3D, `max-h-[90vh]`, conteúdo com scroll interno se necessário.
- **Responsividade mobile**: crachá redimensiona (escala em telas <640px), botões empilham.
- **Download de imagem (não funciona hoje)**:
  - Problema raiz: `oklch()` nos estilos quebra `html2canvas` (erro detectado no runtime: "Attempting to parse an unsupported color function oklch")
  - Solução: renderizar fora do DOM atual em um container clone com cores convertidas para sRGB hex; OU usar `html-to-image` (suporta oklch nativamente)
  - **Vou trocar `html2canvas` por `html-to-image`** — funciona com tokens modernos e gera PNG real para impressão
- **Restaurar itens removidos do crachá** (verificar versão anterior do `cracha-card.tsx` e recolocar elementos perdidos: faixa "SERVICE DESK", pontinho de status, etc. conforme print de referência).

---

### 4. Remoção de Dados Mockados
- **Dashboard** (`/dashboard`): auditar e ligar 100% a queries reais (cards de stats, gráficos, últimos chamados).
- **Atribuição** (`/atribuicao`): listar técnicos/chamados reais do banco.
- **Clientes** (`/clientes`): garantir lista vinda do banco (já está, validar).
- **Relatórios** (`/relatorios`): substituir números/gráficos fake por agregações reais.
- **Logs** (`/logs`): ver bloco 5.

---

### 5. Sistema de Logs Automático (alto nível)
- **Nova tabela `system_logs`** com: `id, actor_id, actor_email, action, entity, entity_id, metadata jsonb, ip, user_agent, created_at`.
- **Hook global `useActivityLogger`** disparado em:
  - Login / logout
  - Criação / edição / exclusão de tickets, técnicos, clientes
  - Aprovação / rejeição de cadastros
  - Mensagens enviadas
  - Mudanças de status
- **Server function `logEvent`** com `requireSupabaseAuth`, captura IP via `getRequestIP` e UA via headers.
- **Triggers SQL** em tabelas críticas (tickets, profiles, technician_signups) para capturar mudanças mesmo sem passar pelo app.
- **Tela `/logs` redesenhada**: tabela em tempo real (realtime channel), filtros por ator/ação/entidade, busca, paginação.

---

### 6. Notificações
- **Card de notificação responsivo mobile**: dropdown vira sheet/drawer full-screen em telas pequenas.
- **Configurações de notificação por tipo** (em `/configuracoes`):
  - Toggles: Novos chamados, Cadastros pendentes, Mensagens, Atribuições
  - Salvos em `notification_preferences` (nova tabela: `user_id, type, enabled`)
  - Edge no trigger SQL: respeitar preferência antes de inserir notificação

---

### 7. Contraste / Ícones em Modo Claro
- Auditar e corrigir cards de status com problema de contraste (apagados no modo claro):
  - Card "Pendentes" (Dashboard e Chamados) — ícone de relógio
  - Outros badges/ícones quando aplicável
- Usar tokens semânticos (`text-warning`, `bg-warning/10`) em vez de cores hardcoded.

---

### 8. Performance / Navegação Fluida
- **Remover spinner de carregamento "ao entrar na tela"** quando a query já tem cache → usar `placeholderData: keepPreviousData` e skeleton sutil só no primeiro mount global.
- **Preload de rotas** em hover de `<Link>` (já parcialmente configurado, garantir `defaultPreloadStaleTime: 30s`).
- Atualização automática a cada 1s onde faz sentido (rastreio, mensagens) via realtime, **não** polling.

---

### 9. Login / Acesso Técnico
- Garantir login funcional, sem delays, com:
  - Validação inline (e-mail / senha obrigatórios)
  - Loading state no botão
  - Redirect imediato pós-auth (sem flash)
  - Mobile 100% responsivo (campos full-width, botões grandes, viewport fit)
- Acesso técnico: ícone do crachá no sidebar/header (já existe via `/meu-cracha`, validar visibilidade).

---

### 10. Segurança Pesada (Anti-Devtools)
**Importante — aviso técnico**: bloqueios anti-F12/anti-devtools no navegador **não são à prova de bala** (qualquer usuário avançado contorna). Mesmo assim, vou implementar a camada mais agressiva possível:
- **Bloqueio de teclas**: F12, Ctrl+Shift+I/J/C, Ctrl+U, Ctrl+S
- **Bloqueio de menu de contexto** (clique direito)
- **Detecção de devtools aberto** (técnica `debugger` em loop + diff de `window.outerHeight - window.innerHeight`) → redireciona pra `/login` e desloga
- **Desabilita seleção de texto** em áreas sensíveis (não na inteira para não quebrar UX)
- **Console banner** de aviso (estilo Facebook)
- **Source map off** em produção (já está no Vite)
- **Anti-iframe** (X-Frame-Options via meta + JS top!==self → redirect)
- **Integrity check leve**: hash do bundle verificado em runtime
- **Watermark invisível** com user_id em todas as páginas (anti-clone/print)

Aplicado **apenas em rotas autenticadas** (`_app`), nunca no login para não quebrar reset de senha.

---

### 11. Itens do PDF da Estrutura (revisão e implementação)
Vou reler o PDF e implementar:
- **Cap. 04 — Indicador "novo" + mídia nos cards de chamado**
- **Cap. 07-08 — Encerramento de chamado obrigatório com**:
  - Rotina técnica executada (texto)
  - Equipamentos/peças usadas (lista com qtd)
  - Validação: não permite mudar status para `closed` sem esses campos
- **Cap. 14 — Avaliação por estrelas** (cliente avalia ticket fechado, 1-5 estrelas + comentário)
- **Relatórios PDF/Excel** (hoje só CSV) — usar `jspdf` + `xlsx`

Após releitura, retorno **lista final do que ainda falta** vs PDF.

---

### Detalhes técnicos chave
- Migrations SQL para: `system_logs`, `notification_preferences`, `ticket_ratings`, `ticket_resolution` (rotina + peças), trigger de log
- Trocar `html2canvas` por `html-to-image` (`bun add html-to-image`)
- Novo hook `useActivityLogger`, novo hook `useAntiTamper`
- Componentes novos: `RatingStars`, `TicketCloseDialog`, `MobileStepBar`, `NotificationsSheet`

---

### Ordem de execução
1. Migrations (logs, preferências, rating, resolução)
2. Fix crítico crachá (html-to-image + responsividade + bug modal)
3. Mapa (tema dinâmico + sem marca d'água + rastreio profissional)
4. Solicitar Cadastro (mobile + placeholders + validações)
5. Limpeza de mocks (Dashboard, Atribuição, Relatórios)
6. Sistema de Logs + tela
7. Notificações (mobile + preferências)
8. Fluxo de chamado (novo, mídia, encerramento, avaliação)
9. Relatórios PDF/Excel
10. Contraste + performance + login técnico
11. Camada de segurança anti-devtools
12. Releitura PDF → relatório final do que ainda falta

Pode aprovar que eu sigo na ordem.
