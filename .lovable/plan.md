
Plano de finalização sênior — dividido em 7 fases. Tudo sincronizado via React Query + Realtime, sem reloads, sem mocks.

---

## Fase 1 — Correção do "Novo chamado" e fluidez geral

**Problema:** ao criar chamado novo, ele não aparece imediatamente; navegação entre telas dispara "atualizações" visuais (flicker).

- Em `chamados.tsx`:
  - `useMutation` de criação deve devolver a linha criada (`.insert(...).select().single()`) e fazer `qc.setQueryData(["tickets-list"], old => [novo, ...old])` (optimistic insert) antes do invalidate.
  - Adicionar `staleTime: 30_000` e `refetchOnWindowFocus: false` em todas as queries de lista (tickets, dashboard, técnicos, clientes) para acabar com o "pisca ao trocar de aba".
- Realtime já existe; manter, mas reduzir invalidations duplicadas.
- Blindar erros: try/catch + toast com mensagem real do Supabase; nunca falhar silencioso.
- Em `__root.tsx`, garantir que o `router.invalidate()` do `onAuthStateChange` só dispare em eventos `SIGNED_IN`/`SIGNED_OUT`, não em `TOKEN_REFRESHED` (causa do "atualiza do nada").

## Fase 2 — Dashboard: filtros Hoje / 7 dias / 30 dias

- Estado `range: "today" | "7d" | "30d"` no `DashboardPage`.
- Botões controlados (variant ativa = `default`, inativos = `outline`).
- `useMemo` recomputa `counts`, `statusData`, `trendData`, `productivityData` aplicando o range sobre `created_at`.
- `trendData` ajusta janela (1 / 7 / 30 dias) dinamicamente.

## Fase 3 — Unificar "Atribuição" dentro de "Chamados" + modal de atribuir

- Remover item "Atribuição" do sidebar; manter rota `/atribuicao` redirecionando para `/chamados?tab=unassigned`.
- Em `chamados.tsx`:
  - Nova aba/filtro "Sem responsável" (status open + assigned_to null).
  - **Card do Kanban:** o ícone "três pontinhos" abre um `Popover` (estilo do print enviado) com as ações:
    - Abrir chamado
    - Atribuir técnico → abre `Dialog` listando todos os técnicos (avatar, nome, especialidade) com busca; ao clicar, faz `update tickets set assigned_to, status='in_progress'`.
    - Mover para próximo status (Aberto → Em andamento → Resolvido)
    - Encerrar chamado
    - Imprimir/exportar
  - Mutation com optimistic update + invalidate de `["tickets-list"]` e `["dashboard-tickets"]`. Realtime cuida do espelhamento em outros dispositivos.
- A página `/atribuicao` continua acessível mas exibe a mesma lista de chamados sem técnico, com o mesmo botão "Atribuir" abrindo o mesmo modal compartilhado (`<AssignTechDialog />` reutilizável em `src/components/assign-tech-dialog.tsx`).

## Fase 4 — "Meu Perfil" para técnico

- Nova rota `/_app/meu-perfil.tsx` (e item no sidebar do técnico: ícone `UserCircle`, label "Meu Perfil").
- Form completo editável: foto (upload em `technician-photos/{userId}/avatar.{ext}`), nome, telefone, especialidade, cargo, bio, endereço.
- Salva em `profiles` via `update().eq("id", user.id)`.
- Ao salvar, invalida `["profile", user.id]` e `["tech", user.id]` → o crachá puxa `photo_url` e `full_name` automaticamente (já lê de `profiles`).
- Preview da foto antes do upload, compressão (canvas → JPEG 80%, max 800px) para economizar storage.

## Fase 5 — Crachá: limpeza visual + QR funcional

- Em `cracha-card.tsx`:
  - Remover a bolinha verde "online" (linhas 89-98).
  - `qrValue` passa a apontar para o domínio real publicado: `${window.location.origin}/validar/${tech.id}` (em SSR fallback para URL Lovable).
- Nova rota **pública** `src/routes/validar.$id.tsx` (sem `_app`, sem auth):
  - Loader carrega via `createServerFn` (admin client, somente campos públicos: nome, foto, cargo, especialidade, matrícula, vínculo, status).
  - Renderiza um `CrachaCard` centralizado + selo "Identidade validada · JJ Informática" + data/hora da validação.
  - Tratamento de não encontrado: tela "Crachá inválido ou revogado".
- Atualiza também o link do crachá no modal de impressão.

## Fase 6 — Varredura de funcionalidades incompletas

Auditoria já feita no painel. Pendências encontradas e ações:

- **Busca global no header:** input existe mas não faz nada → ligar a `useState` + filtro em `chamados`/`tecnicos` via navegação (`/chamados?q=...`).
- **Mensagens:** verificar realtime do mural (já tem trigger); garantir scroll-to-bottom em nova mensagem.
- **Monitoramento:** confirmar que `technician_locations` está sendo atualizado e mapa renderiza últimos pontos.
- **Configurações → Notificações:** já está salvando, validar todos os toggles.
- **Logs:** paginação + filtro por action/level.
- **Relatórios:** confirmar geração PDF/Excel com filtros aplicados.
- **Cadastros pendentes:** garantir que "Atribuir login" recarrega lista após criar.

## Fase 7 — QA final e blindagem

- Adicionar `errorComponent` em rotas críticas (`chamados`, `dashboard`, `meu-perfil`, `validar.$id`).
- Wrappers `try/catch` em todas as mutations com toast de erro claro.
- Smoke test manual:
  1. Criar chamado → aparece em lista e Kanban sem reload.
  2. Arrastar card / usar popover "Atribuir" → atualiza em `/atribuicao` e dashboard.
  3. Filtro Hoje/7d/30d no dashboard altera números.
  4. Técnico troca foto → crachá reflete em tempo real.
  5. Escanear QR do crachá → abre `/validar/{id}` com dados corretos.
  6. Navegação entre telas sem flicker.

---

### Arquivos criados
- `src/routes/validar.$id.tsx`
- `src/routes/_app/meu-perfil.tsx`
- `src/components/assign-tech-dialog.tsx`
- `src/components/ticket-card-menu.tsx` (popover do Kanban)
- `src/lib/api/validate.functions.ts`

### Arquivos editados
- `src/routes/_app/chamados.tsx` (mutation + popover + filtro sem responsável)
- `src/routes/_app/dashboard.tsx` (range filter funcional)
- `src/routes/_app/atribuicao.tsx` (redirect + reuso do AssignTechDialog)
- `src/components/app-sidebar.tsx` (remover Atribuição; adicionar Meu Perfil para técnicos)
- `src/components/cracha-card.tsx` (remover bolinha verde, QR para /validar)
- `src/routes/__root.tsx` (onAuthStateChange só em SIGNED_IN/OUT)
- `src/routes/_app.tsx` (busca global ligada)

### Sem alterações de banco
Tudo usa tabelas e buckets existentes. Nenhuma migração necessária.
