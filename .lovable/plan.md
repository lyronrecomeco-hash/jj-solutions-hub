## Plano de implementação

### 1. Chamados — abrir detalhes na setinha
- Em `src/routes/_app/chamados.tsx`, transformar o `ChevronRight` (linha do card) num botão que abre um `Sheet` lateral com todos os detalhes do chamado (cliente, contato, equipamento, descrição, prioridade, status, responsável, datas, histórico básico). Não remove navegação existente.

### 2. Configurações → Organização (CNPJ + e-mail)
- `src/routes/_app/configuracoes.tsx`: adicionar campo CNPJ (máscara simples) e manter e-mail de contato.
- Persistir em `app_settings.key='organization'` como `{ name, cnpj, contact_email }`.
- `src/components/cracha-card.tsx` (verso): ler `organization` settings via query e exibir e-mail + CNPJ atualizados automaticamente. Invalidação por realtime/refetch ao salvar configurações.

### 3. Atribuição — botão excluir
- `src/routes/_app/atribuicao.tsx`: adicionar ação "Excluir" no item da lista com `AlertDialog`. Ao confirmar, deleta o ticket (`tickets` delete) e invalida queries de `chamados` e `atribuicao`.

### 4. Status online/offline da equipe
- `src/hooks/use-auth.tsx` (ou novo `use-presence.tsx`): ao logar, marca `profiles.status='online'` e `last_seen_at=now()`; no logout / `beforeunload` / visibility hidden por X segundos → `offline`. Heartbeat a cada 30s.
- `src/routes/_app/tecnicos.tsx`: exibir badge online/offline lendo `profiles.status` em tempo real (realtime subscription).

### 5. Mensagens — botão excluir ao lado do olhinho
- `src/routes/_app/mensagens.tsx`: na coluna de ações da conversa/lista, adicionar `Trash2` que confirma e deleta a mensagem em `technician_messages` (RLS já permite autor/staff).

### 6. Segurança anti-F12 reforçada
- `src/hooks/use-anti-tamper.tsx`: ampliar — bloquear F12, Ctrl+Shift+I/J/C/U, Ctrl+U, menu de contexto, detectar DevTools aberto (debugger trap + dimensão window), limpar console periodicamente, desabilitar seleção em áreas sensíveis. Aplicar somente em rotas autenticadas para não atrapalhar login/cadastro público. Sem afetar UX nem performance.

### 7. Superadmin `admin@painel.com`
- `src/hooks/use-permissions.tsx`: helper `isSuperAdmin = email === 'admin@painel.com'`.
- `src/routes/_app/tecnicos.tsx`: botões de ação ficam clicáveis só para superadmin; outros admins veem com `opacity-50 pointer-events-none` e tooltip "Apenas o superadministrador pode executar esta ação".
- Reforço no servidor: nada extra (RLS continua igual); a restrição é de UI conforme pedido ("outro admin pode ver, não clicar").

### 8. Escalabilidade / mensagens não oscila
- `src/router.tsx` (queryClient): aumentar `staleTime` padrão (30s) e `gcTime` (5min), `refetchOnWindowFocus:false`.
- `mensagens.tsx`: usar canal realtime único compartilhado, debounce de scroll, `keepPreviousData` para evitar flicker.
- Sem mudanças de design.

### 9. Login → "Esqueci minha senha"
- `src/routes/login.tsx`: transformar o link num botão que abre um `Dialog` responsivo com mensagem profissional: "Para recuperar seu acesso, entre em contato com o administrador deste painel." + botão "Entendi".

### 10. Modal de boas-vindas (admin + técnico)
- Novo `src/components/welcome-tour.tsx`: `Dialog` modal não-fechável (`onOpenChange` ignorado até final), com slider de 4–5 passos (`Próximo` / `Voltar` / `Começar`).
- Conteúdo distinto para admin e técnico (textos diferentes).
- Persistir flag em `localStorage` (`welcome_seen_${userId}`) — primeira vez sempre aparece para qualquer usuário existente que ainda não viu.
- Acionado em `src/routes/_app.tsx` após autenticação.
- Design sóbrio, sem neon, responsivo total.

### Arquivos a tocar
- src/routes/_app/chamados.tsx
- src/routes/_app/atribuicao.tsx
- src/routes/_app/configuracoes.tsx
- src/routes/_app/tecnicos.tsx
- src/routes/_app/mensagens.tsx
- src/routes/_app.tsx
- src/routes/login.tsx
- src/components/cracha-card.tsx
- src/components/welcome-tour.tsx (novo)
- src/hooks/use-anti-tamper.tsx
- src/hooks/use-auth.tsx (ou novo use-presence.tsx)
- src/hooks/use-permissions.tsx
- src/router.tsx

### Sem mudanças
- Design tokens, layout geral, schema do banco (apenas valores em `app_settings`).
