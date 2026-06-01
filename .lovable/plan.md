## Plano de execução — Refinamento profundo da plataforma JJ Informática

Tudo será feito sem quebrar nada que já funciona. Cada etapa entrega valor isolado.

---

### 1. Restaurar menu lateral (sidebar)
- Reverter remoções. Deixar todos os itens originais visíveis para o admin/staff:
  Operação (Dashboard, Chamados), Gestão de Técnicos (Equipe Técnica, Cadastros Pendentes, Atribuição, Monitoramento), Clientes, Análise (Relatórios, Mensagens), Sistema (Configurações, Logs).
- Único item realmente removido permanece: "Criar Técnico" (conforme pedido anterior).
- Adicionar novo item **"Monitoramento"** dentro de Gestão de Técnicos (rastreio em tempo real).

### 2. Tela de Login — refinamento
- Remover o `SignupFormDialog` (modal). Criar rota dedicada `/solicitar-cadastro` com transição animada (slide/fade via framer-motion) saindo do login.
- Formulário limpo, multi-etapa, em página inteira: dados pessoais → endereço → foto + e-mail/senha.
- `employment_type` fixo como `field` (não exibido ao usuário).
- Após enviar: tela de confirmação "Cadastro recebido, em análise" com botão voltar.
- Inputs com bordas/contraste melhorados no modo claro (sem exagero — apenas elevar `--border` e foco do input).
- Botão "Solicitar cadastro de técnico" no login navega para a nova rota.

### 3. Cadastros Pendentes — redesign
- Layout em **tabela responsiva centralizada respeitando todo o conteúdo principal** (sem espaço sobrando à direita): container `max-w-full` + grid alinhado.
- Colunas: Foto, Nome, Email, Telefone, Cidade, Data, Status, Ações.
- Ações em cada linha: ✓ Aceitar · ✗ Recusar · ⏸ Deixar em espera · 🗑 Excluir · 👁 Ver chat/perfil.
- Modal "Ver" mostra todos os dados enviados + galeria de mídia (foto/anexos) + histórico de mensagens daquele candidato (chat real, scroll, bolhas).
- Paginação real (10/página).
- Tempo real via Supabase Realtime: nova solicitação aparece imediatamente sem refresh.
- Remover todos os dados mock/placeholder.

### 4. Mensagens — chat real com "visto" e badges
- Manter mural por técnico, mas adicionar:
  - **Realtime** via `supabase.channel` em `technician_messages` (insert/update).
  - **Visto** (read receipts): nova coluna `read_at` em `technician_messages`. Quando o destinatário abre o chat, marcamos como lido. Renderiza ✓ / ✓✓ azul (estilo WhatsApp).
  - **Contador de não lidas** na lista lateral de técnicos (badge vermelho com número) e no item "Mensagens" do menu lateral.
  - **Som de notificação** ao chegar nova mensagem (WebAudio API, beep curto gerado em runtime — sem assets externos).
  - **Toast inferior direito** (sonner) com preview da mensagem, dura 10s, clicável para abrir o chat. Vai também para a central de notificações.
- Remover todo travessão "—" decorativo (substituir por espaço/vazio onde aparecer).

### 5. Central de Notificações (sino no topo)
- Novo dropdown ao clicar no sino do header.
- Tabela nova `notifications` (user_id, type, title, body, link, read_at, created_at) com RLS (cada usuário vê as suas).
- Triggers no Postgres:
  - Insert em `technician_signups` → notifica admins.
  - Insert em `tickets` → notifica admins + técnico atribuído.
  - Update `assigned_to` em `tickets` → notifica novo técnico.
  - Insert em `technician_messages` → notifica destinatário.
- Realtime no client: contador vermelho no sino, lista com "marcar como lida / marcar todas".
- Som + toast no canto inferior direito (mesma infra das mensagens, central em `src/hooks/use-notifications.tsx`).

### 6. Monitoramento e Rastreio em Tempo Real
- Nova tabela `technician_locations` (user_id, lat, lng, accuracy, updated_at) com RLS (staff lê todas, técnico escreve a própria).
- Hook `useGeolocationTracker` ativo enquanto técnico está logado: pede permissão, envia posição a cada 15s via upsert.
- Página `/monitoramento`: mapa Leaflet + OpenStreetMap mostrando todos os técnicos online, marcadores com foto/iniciais.
- Em `/tecnicos`, nova ação "📍 Rastrear" abre modal com mapa Leaflet focado naquele técnico (atualiza em tempo real via Supabase Realtime).
- Registro de **login tracking**: cada sign-in grava em `audit_logs` (action `login`) com IP/user-agent.

### 7. Configurações — redesign profissional
- Substituir abas verticais/cards desorganizados por **abas horizontais no topo** (`Tabs` shadcn).
- Seções: Geral · Aparência · Notificações · Segurança · Equipe · Integrações.
- Layout em grid 2 colunas (label esquerda, controles direita), espaçamento consistente, cards bem alinhados.
- Funcional: salvar preferências em `profiles` / `user_settings` (criar tabela leve `user_settings` se preciso).

### 8. Clientes — construir a tela completa
- Listagem real (tabela: empresa, contato, cidade, telefone, email, # chamados).
- Ações: novo cliente (sheet), editar, excluir, ver detalhes (modal com histórico de chamados).
- Filtro/busca e paginação.
- 100% conectado à tabela `clients` que já existe.

### 9. Limpeza geral
- Remover todos os "—" placeholders nos cards/listas → render condicional (não mostra label se vazio).
- Remover qualquer mock restante (relatórios usam dados reais ou estado vazio elegante).
- Performance: `defaultPreload: "intent"` já está; garantir que rotas grandes (mensagens, monitoramento) usem `React.lazy`/dynamic onde fizer sentido.

---

### Mudanças de Banco (migrations)
1. `technician_messages` → adicionar `read_at timestamptz`.
2. Nova tabela `notifications` com RLS + GRANTS + realtime publication.
3. Nova tabela `technician_locations` com RLS + GRANTS + realtime.
4. (opcional) `user_settings` para preferências.
5. Triggers de notificação automática (signup, ticket assign, mensagem nova).
6. Adicionar `technician_messages`, `notifications`, `technician_locations`, `technician_signups` à `supabase_realtime` publication.

### Pacotes a instalar
- `leaflet`, `react-leaflet`, `@types/leaflet`.

### Fora de escopo nesta rodada
- Push notifications nativas (browser Notification API pode ser adicionada como bônus).
- Mobile-native GPS background tracking (limitação do navegador).

---

### Ordem de execução
1. Migrations (banco + realtime).
2. Sidebar restaurada + rota `/monitoramento` + `/solicitar-cadastro`.
3. Hook global `useNotifications` (realtime + som + toast + sino).
4. Mensagens redesenhadas (visto, badges, realtime, som).
5. Cadastros Pendentes redesenhado (tabela + ações + modal chat).
6. Login + tela de solicitar cadastro (transição).
7. Monitoramento (Leaflet) + rastreio por técnico.
8. Configurações horizontal.
9. Clientes funcional.
10. Limpeza de "—" e mocks; ajustes finais de contraste no modo claro.

Confirma para eu implementar?