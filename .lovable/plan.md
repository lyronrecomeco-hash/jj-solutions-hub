## Plano de correção preciso

### 1) Remover o ícone de mensagens do topo
- Remover o componente `MessagesBell` do header do painel.
- Remover também o import dele em `_app.tsx`.
- Manter o sino de notificações normal, sem alterar o fluxo existente.

### 2) Badge vermelho no menu “Mensagens” da sidebar
- Reaproveitar a contagem de mensagens não lidas.
- Mostrar o badge vermelho diretamente no item “Mensagens” do menu lateral, acima/ao lado do nome conforme o espaço do sidebar permitir.
- No estado colapsado, manter o badge pequeno sobre o ícone.
- Não criar outro ícone no topo.

### 3) Corrigir “Meu Perfil” no painel do técnico
- Ajustar o container para ocupar a largura útil do layout corretamente, sem ficar jogado para a direita e sem centralizar tudo.
- Usar grid responsivo: cartão de foto/dados em uma coluna lateral controlada e formulário usando o restante do espaço no desktop.
- No mobile, empilhar tudo com padding correto, sem sobras laterais e sem quebrar campos.

### 4) Remover o bloco extra de “Chamados a atribuir” da tela Chamados
- Remover apenas o bloco destacado mostrado no print dentro de `Chamados`.
- Não remover a rota nem o menu “Atribuição”.
- Manter a sincronização de atribuição funcionando via lista principal e realtime.

### 5) Remover “Sem responsável” da aba/filtro de Chamados
- Tirar o filtro/aba “Sem responsável” da tela de Chamados.
- Manter chamados sem técnico aparecendo normalmente em “Todos” e nos status corretos.
- Manter a aba “Atribuição” separada intacta.

### 6) Popover do Kanban no lugar certo
- Tirar o popover do botão/área errada do card.
- Colocar o popover na setinha do topo do card/coluna indicada pelo comportamento atual, sem interferir no arrastar do Kanban.
- Manter ações: abrir chamado, atribuir/reatribuir, avançar status, encerrar, cancelar.

### 7) Chamados no painel técnico 100% responsivo
- Para técnico comum, a tela `Chamados` será lista normal, sem Kanban.
- Layout mobile com cards/lista limpa, sem tabela apertada e sem overflow horizontal.
- Chamado atribuído ao técnico deve aparecer automaticamente pela query + realtime, sem delay perceptível.
- Staff/admin continuam com opção de lista/Kanban.

### 8) Mensagens no mobile
- Ajustar o chat do técnico para ocupar a tela como conversa nativa, não como modal.
- Reduzir o placeholder para `Escreva algo.`
- Fixar área de digitação no rodapé do chat, com altura segura para mobile.
- Melhorar scroll e largura das bolhas para não estourar a tela.

### 9) Eliminar flicker/recarregamento rápido ao trocar de tela
- Remover qualquer navegação manual desnecessária que cause refresh visual.
- Trocar navegações problemáticas por `Link`/`navigate` interno do TanStack quando aplicável.
- Evitar troca para tela de loading quando o usuário e sessão já existem.
- Ajustar queries sensíveis com `staleTime`, `refetchOnWindowFocus: false` e cache estável, sem deixar lento.
- Verificar o hook de permissões/sidebar para impedir “pisca” de menu ao navegar.

### 10) Administradores: ações com editar, ver e excluir
- Na lista de administradores, substituir o clique no badge por uma área de ações clara.
- Adicionar três botões com ícones:
  - editar
  - ver
  - excluir
- Manter a confirmação antes de excluir/revogar acesso.
- Não alterar permissões além do necessário para essas ações visuais/funcionais.

### 11) Suporte para deploy na Vercel
- Ajustar configuração sem quebrar o preview atual do Lovable.
- Usar Nitro/TanStack Start com preset Vercel somente quando o ambiente for Vercel.
- Adicionar configuração mínima de deploy se necessário, mantendo `bun run build` como build command.
- Não expor secrets nem alterar `.env`.

### Arquivos que serão tocados
- `src/routes/_app.tsx`
- `src/components/app-sidebar.tsx`
- `src/components/messages-bell.tsx` será removido se não ficar mais usado
- `src/routes/_app/meu-perfil.tsx`
- `src/routes/_app/chamados.tsx`
- `src/routes/_app/mensagens.tsx`
- `src/routes/_app/administradores.tsx`
- `src/hooks/use-permissions.tsx` se for necessário para parar o flicker
- `vite.config.ts` e possivelmente `vercel.json` para deploy Vercel

### Garantias
- Não remover “Atribuição”.
- Não remover menus existentes além do ícone extra de mensagens no topo.
- Não mexer em banco de dados sem necessidade.
- Não alterar fluxo de autenticação além do necessário para parar flicker.
- Validar com build/teste automático do harness após implementação.