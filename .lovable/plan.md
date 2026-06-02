
# Plano de finalização — JJ Informática

Analisei o painel atual e o PDF v1.0 (HyroCode). Tudo abaixo é executável sem refazer o que já está pronto.

---

## Fase 1 — Cadastro pendente + documento com foto + "Atribuir login"

Cap. 01 e 02 do PDF.

1. Migração: adicionar em `technician_signups`:
   - `document_url text` (foto do documento)
   - `document_type text` ("rg" | "cnh")
2. Bucket Storage `signup-documents` (público leitura para staff via policy) + policies.
3. Tela `/solicitar-cadastro`:
   - Adicionar campo upload "Documento com foto (RG/CNH)" obrigatório, antes do envio.
   - Mostrar preview, validar tamanho/tipo (jpg/png/pdf até 8MB).
4. Tela `/cadastros-pendentes`:
   - No "olhinho" (ver detalhes), exibir o documento enviado em galeria.
   - Substituir botão "Aprovar" simples por **"Atribuir login"** → abre Sheet à direita:
     - Nome, sobrenome (auto-preenchidos)
     - E-mail (auto)
     - Senha inicial (gerada + visível + copiar)
     - Nível de acesso (tech / senior_tech / supervisor / admin)
     - Permissões de menu (checkboxes — ver Fase 4)
   - Ao salvar: server function `createTechnicianAccount` (admin client) cria usuário no auth, profile, role e permissões, marca signup como `approved`, e dispara e-mail com credenciais.
5. Rejeitar continua igual (motivo obrigatório).

---

## Fase 2 — Administradores: substituir "Conceder" por "Adicionar"

1. Em `/administradores`:
   - Remover o bloco "Conceder acesso por e-mail".
   - Botão **"+ Adicionar usuário"** abre Sheet à direita com:
     - Nome, Sobrenome
     - E-mail
     - Senha
     - Nível de acesso (admin / supervisor / senior_tech / tech)
     - Permissões de menu (checkbox por item do sidebar)
   - Submit → server fn `createStaffAccount` (admin client) cria auth user + profile + role + linha em `admin_permissions`.
2. Listagem permanece (com chips), mas adiciona coluna "Permissões" mostrando contagem; clique abre Sheet de edição.
3. **Itens com permissão negada não aparecem no sidebar** — `app-sidebar.tsx` lê `admin_permissions.permissions` do usuário logado e filtra. Admin puro ignora filtro.

---

## Fase 3 — "Meus dados" (tenant isolado para técnico)

1. Renomear rota `/meu-cracha` para `/meus-dados` (manter alias para compat).
2. Sidebar do técnico: item "Meu crachá" vira **"Meus dados"**.
3. Tela `/meus-dados` exibe **apenas o próprio perfil** (não a lista):
   - Aba "Cadastro": Nome, CPF, RG, Endereço completo, Documento com foto (visualizar), Telefone, E-mail, Especialidade. Editável onde o PDF permite.
   - Aba "Chamados": fila do técnico (`status in (open, in_progress, scheduled)` + `assigned_to = auth.uid()`).
   - Aba "Resolvidos": histórico (`status in (resolved, partially_resolved, not_resolved, cancelled)` + `assigned_to = auth.uid()`).
   - Aba "Crachá": componente existente.
4. RLS de `tickets` já força isolamento ("Techs see assigned tickets") — query no client usa `.eq('assigned_to', user.id)` como defesa em profundidade.
5. Remover rota `/tecnicos` do menu do técnico (só admin/supervisor).

---

## Fase 4 — Permissões de menu (motor)

1. Migração: `admin_permissions.permissions` jsonb fica `{ menus: { dashboard: true, chamados: true, ... } }`.
2. Hook `usePermissions()` carrega permissões do usuário logado.
3. `app-sidebar.tsx` filtra itens pelo hook (admin bypassa).
4. Guards de rota: cada `_app/*` faz `if (!can("rota")) navigate("/")`.

---

## Fase 5 — Novo chamado em painel lateral

1. Em `/chamados`, botão "Novo chamado" abre `<Sheet side="right">` em vez do modal.
2. Form em 3 seções (Cliente, Atendimento, Detalhes), com upload de evidências inicial opcional.
3. Validação Zod; cria ticket + atribuição opcional.

---

## Fase 6 — Kanban com realtime + drag

1. Em `/chamados`, toggle no topo: **Lista | Kanban** (Tabs).
2. Kanban: colunas por status (Aberto, Em andamento, Agendado, Resolvido, Não resolvido, Cancelado).
3. Drag & drop com `@dnd-kit/core` (instalar).
   - Admin/supervisor: pode arrastar entre quaisquer colunas (respeitando RN-03).
   - Técnico: só pode arrastar dos seus chamados e seguindo o fluxo permitido.
4. Cards bem alinhados: número, título, cliente, prioridade (borda esquerda colorida), badge de mídia, ponto azul "novo".
5. Realtime: `supabase.channel('tickets').on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, ...)` invalida o `useQuery` (`queryClient.invalidateQueries(['tickets'])`). Habilitar via migração: `ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;` (idempotente com `IF NOT EXISTS` lógica).
6. Encerramento via técnico já atualiza o status → aparece instantaneamente no Kanban do admin.

---

## Fase 7 — Relatórios PDF/Excel reais

Cap. 14 do PDF. Bibliotecas `jspdf`, `jspdf-autotable`, `xlsx` já instaladas.

1. Em `/relatorios`:
   - Filtros: Técnico (ou Todos), Período (mês atual / anterior / intervalo), Tipo de serviço, Cliente, Status.
   - Preview no app + botões **Exportar PDF** e **Exportar Excel**.
2. PDF: cabeçalho JJ, resumo (total, resolvidos, em andamento, tempo médio, avaliação média), tabela com `jspdf-autotable`, rodapé com data/usuário.
3. Excel: 1 aba "Resumo" + 1 aba "Chamados" + 1 aba "Avaliações".
4. Server fn `getReportData` (auth) agrega dados respeitando RLS.

---

## Fase 8 — Preferências de notificação reais

1. Em `/configuracoes` → aba Notificações:
   - Lista de tipos: `ticket`, `message`, `signup`, `sla`, `sound`.
   - Toggle por tipo grava em `notification_preferences (user_id, type, enabled)` via upsert.
   - Já existe a função `notification_enabled()` no DB — confirma respeito.
2. Carregar valores atuais no mount; salvar com debounce + toast.

---

## Fase 9 — Limpeza de mocks no Dashboard

1. `dashboard.tsx`: substituir blocos "productivity" e "trends" mockados por queries reais:
   - Produtividade = chamados resolvidos por técnico nos últimos 30 dias (agrupado).
   - Tendência = série diária de chamados criados vs resolvidos (últimos 14 dias).
2. Usar `recharts` (já presente).
3. Se não houver dados: empty state com ilustração, sem números falsos.

---

## Fase 10 — Polimento e QA final

1. Login técnico: revisar responsividade mobile (já parcial).
2. Scrollbars transparentes globais (já aplicado, validar nos novos sheets).
3. Indicador "novo" + ícone de mídia nos cards de chamado em lista e Kanban.
4. Smoke test manual de cada fluxo; checar console e network.

---

## Capacidade do backend gratuito

Lovable Cloud (Supabase free):
- **Banco**: 500 MB. Tabelas atuais (perfis, tickets, mensagens, logs, notifs) cabem confortavelmente milhares de chamados em texto puro — estimativa: ~20-30k chamados antes de apertar.
- **Storage**: 1 GB. É o gargalo real (fotos de evidência + documentos). Estimativa: ~500 chamados com 5 fotos médias (≈400KB cada) ou ~1500 com compressão.
- **Bandwidth**: 5 GB/mês.
- **Edge Functions / Auth users**: 50k MAU.

**Recomendação dentro do free:** compressão de imagens no upload (já planejada no Fase 1/9 do PDF) e limite de mídias por chamado (20 já consta no PDF). Para o porte da JJ (poucos técnicos, ~50–150 chamados/mês), o plano **Free aguenta tranquilamente os primeiros 6–12 meses**. Crescendo, o passo natural é Supabase Pro ($25/mês: 8 GB DB + 100 GB Storage).

---

## Ordem de execução

Vou implementar as fases **na ordem acima**, cada uma com migração (se houver) + código + verificação. Não toco nada que não foi pedido. Nada de mocks deixados para trás.
