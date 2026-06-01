
# Plano de Evolução — JJ Informática

Objetivo: **melhorar** o que já existe (sem recriar) e implementar o que falta segundo o PDF oficial — Crachá Digital, tipos de vínculo do técnico (Field / CLT / PJ), módulos administrativos completos, correções de layout/responsividade e refino do Login.

---

## Fase 1 — Correções visuais críticas (rápida, base sólida)

**1.1 Bug do espaço entre sidebar e conteúdo (todas as telas)**
- O `SidebarInset` da shadcn não está colando no painel fixo da sidebar em Tailwind v4 (variáveis `--sidebar-width` não resolvem em classes shorthand).
- Ajustar `src/components/ui/sidebar.tsx` e `_app.tsx` trocando `w-[--sidebar-width]`/`ml-[--sidebar-width]` por `w-[var(--sidebar-width)]` / `ml-[var(--sidebar-width)]` (incluindo o cálculo do modo `collapsible=icon`).
- Resultado: conteúdo ocupa 100% do espaço restante, sem faixa morta entre o menu e os cards.

**1.2 Responsividade global**
- Header: busca colapsa em ícone < md, avatar com nome oculto < sm.
- Dashboard: grid de KPIs de `grid-cols-2` (mobile) → `sm:grid-cols-3` → `xl:grid-cols-6`.
- Gráficos `recharts` com `ResponsiveContainer` e altura mínima por breakpoint.
- Sidebar em mobile: `Sheet` (já suportado pelo componente), trigger no header.
- Padding adaptativo `px-4 sm:px-6 lg:px-8` em todas as rotas `/_app/*`.

**1.3 Refino do Dark Mode**
- Ajustar contraste de tokens em `src/styles.css`: `--surface-muted`, `--border`, hover states e cores dos gráficos (paleta corporativa azul/verde/âmbar/vermelho — sem neon).
- Cards com micro-elevação (sombra suave + borda 1px), separadores mais sutis.

---

## Fase 2 — Tela de Login redesenhada

**2.1 Remover imagem de fundo do lado esquerdo.**

**2.2 Painel esquerdo "tech animado" (sem neon, corporativo):**
- Fundo: gradiente sólido `oklch` em tons de azul-noite (`--primary` → preto azulado).
- Animação principal (framer-motion + SVG):
  - **Grid de circuito** sutil (linhas finas que pulsam de baixa opacidade).
  - **Constelação de nós** (pontos conectados) que se movem lentamente — metáfora de rede/suporte.
  - **Anéis concêntricos** atrás do logo, com rotação lenta e fade.
- Conteúdo sobreposto: logo grande JJ, headline "Service Desk para times de TI", 3 bullets institucionais (SLA · Field Service · Relatórios), rodapé com versão e selo "Lovable Cloud".
- Painel direito (form) mantido — apenas refino de espaçamento, foco e mensagens de erro.

**2.3 Acessibilidade e responsividade do login**
- < lg: painel animado oculto, form ocupa tela inteira com logo no topo.

---

## Fase 3 — Modelo de dados: vínculo do técnico

Adicionar ao banco (migração) sem quebrar o que existe:
- Enum `employment_type`: `field` (default — freelancer/sem vínculo), `clt`, `pj`, `internal`.
- Colunas em `profiles`: `employment_type` (default `field`), `cpf`, `rg`, `birth_date`, `cep`, `address_number`, `address_complement`, `neighborhood`, `city`, `state`, `photo_url`, `bio`.
- Tabela `technician_equipment` (equipamentos próprios do técnico).
- Tabela `technician_signups` (cadastros pendentes com status `pending|approved|rejected` + motivo).
- RLS: admin gerencia tudo; técnico vê/edita o próprio perfil.

Toda nova tabela vai com `GRANT` + RLS conforme padrão.

---

## Fase 4 — Crachá Digital do Técnico

Rota: `/_app/tecnicos/$id/cracha` + atalho "Meu Crachá" no menu para usuários técnicos.

Layout vertical estilo cartão corporativo:
- Topo: faixa azul com logo JJ.
- **Foto circular** grande do técnico (fallback: iniciais).
- **Nome completo** (destaque).
- **JJ INFORMÁTICA SOLUÇÕES EM TECNOLOGIA** (subtítulo institucional).
- Cargo + especialidade + tipo de vínculo (badge: Field / CLT / PJ).
- Matrícula (`registration_code`) + QR Code (link de validação).
- Rodapé: validade + status (Ativo / Suspenso).
- Botão "Baixar PDF" (html2canvas + jsPDF) e "Compartilhar".

---

## Fase 5 — Menu lateral reorganizado por perfil

Estrutura final do sidebar (visível conforme role):

**Operação** (todos)
- Dashboard
- Chamados
- Meu Crachá (técnico)

**Gestão de Técnicos** (admin/supervisor) — NOVO grupo
- Equipe (listagem)
- Criar Técnico
- Cadastros Pendentes (aprovar/rejeitar)
- Permissões e Vínculos
- Equipamentos por técnico

**Clientes & Atendimento** (admin/supervisor)
- Clientes
- Criar Chamado
- Atribuição de Chamados

**Análise** (admin/supervisor)
- Relatórios (mensal consolidado + por técnico)
- Mensagens

**Sistema** (admin)
- Configurações
- Logs de Auditoria

Filtragem por `isAdmin`/`isStaff` já existente no `useAuth`.

---

## Fase 6 — Módulo Técnicos completo (admin)

**6.1 Listagem `/tecnicos`**: tabela com avatar, nome, especialidade, vínculo (Field/CLT/PJ), status (online/offline/busy), chamados ativos, ações (ver, editar, suspender, gerar relatório, enviar mensagem).

**6.2 Criar técnico `/tecnicos/novo`**: wizard em 3 passos
- Dados pessoais (nome, CPF, RG, nascimento, telefone, email).
- Endereço (CEP com busca, logradouro, número, complemento, bairro, cidade, UF).
- Acesso: **Tipo de vínculo** (Field / CLT / PJ / Interno), nível de permissão (Técnico / Sênior / Supervisor / Admin), senha temporária. Admin cria usuário via server function (`createServerFn` com `supabaseAdmin`).

**6.3 Perfil técnico `/tecnicos/$id`**: abas Dados, Equipamentos, Chamados, Histórico, Crachá.

**6.4 Cadastros Pendentes**: lista pública via formulário de auto-cadastro `/cadastro` → admin aprova/rejeita com motivo.

---

## Fase 7 — Painel do Técnico (visão individual)

Quando logado como técnico (não-staff), o `/dashboard` mostra:
- KPIs próprios (abertos, em andamento, resolvidos no mês).
- Aba "Meus Chamados" (apenas atribuídos a ele — RLS já garante).
- Aba "Resolvidos" (histórico).
- Botão "Meu Crachá".

---

## Fase 8 — Chamados (operação completa)

- Listagem com filtros (status, prioridade, técnico, cliente, período) e cards com borda colorida por prioridade.
- Tela de detalhes do chamado: dados do cliente clicáveis (tel/maps), timeline (`ticket_history`), registro de tempos (iniciar/pausar/retomar/encerrar), relatório técnico obrigatório antes de encerrar, upload drag-and-drop de evidências (Supabase Storage com bucket `ticket-evidence` por categoria).
- Criar chamado (admin) com atribuição a técnico.

---

## Fase 9 — Relatórios e Sistema

- Relatório mensal consolidado (filtro por técnico/período/cliente, export PDF/Excel).
- Logs de auditoria a partir de `ticket_history` + tabela `audit_logs` nova.
- Configurações de notificações por usuário.

---

## Detalhes Técnicos

- **Stack mantida**: TanStack Start + shadcn + Tailwind v4 + Supabase via Lovable Cloud.
- **Animação login**: `framer-motion` + SVG inline (sem dependência pesada).
- **Crachá PDF**: `html2canvas` + `jspdf` (já comuns no ecossistema).
- **Crachá QR**: `qrcode.react`.
- **Upload de foto/evidências**: bucket Supabase Storage `avatars` (público) e `ticket-evidence` (privado, RLS).
- **Criação de usuário pelo admin**: `createServerFn` com `supabaseAdmin.auth.admin.createUser` (service role, somente server).
- **Sem neon**: paleta corporativa, sombras suaves, tipografia já definida.

---

## Ordem de entrega sugerida

1. **Fase 1 + Fase 2** (correções layout + login redesenhado) — entrega 1.
2. **Fase 3 + Fase 4 + Fase 5** (migração vínculo, crachá, novo menu) — entrega 2.
3. **Fase 6** (módulo técnicos completo + criação por admin) — entrega 3.
4. **Fase 7 + Fase 8** (painel do técnico + chamados completo) — entrega 4.
5. **Fase 9** (relatórios, logs, configurações) — entrega 5.

Confirma esta ordem ou prefere priorizar algo específico (ex.: começar pelo Crachá)?
