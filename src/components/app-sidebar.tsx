import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Ticket,
  Users,
  Building2,
  BarChart3,
  MessageSquare,
  Settings,
  ScrollText,
  LogOut,
  IdCard,
  UserCog,
  ShieldCheck,
  Wrench,
  ClipboardList,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { JJLogo } from "@/components/jj-logo";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "@tanstack/react-router";

type NavItem = { title: string; url: string; icon: React.ComponentType<{ className?: string }> };

const operationItems: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Chamados", url: "/chamados", icon: Ticket },
];

const techSelfItems: NavItem[] = [
  { title: "Meu Crachá", url: "/meu-cracha", icon: IdCard },
];

const techManagementItems: NavItem[] = [
  { title: "Equipe Técnica", url: "/tecnicos", icon: Users },
  { title: "Cadastros Pendentes", url: "/cadastros-pendentes", icon: ClipboardList },
  { title: "Permissões & Vínculos", url: "/tecnicos/permissoes", icon: ShieldCheck },
  { title: "Equipamentos", url: "/tecnicos/equipamentos", icon: Wrench },
];

const customerItems: NavItem[] = [
  { title: "Clientes", url: "/clientes", icon: Building2 },
  { title: "Criar Chamado", url: "/chamados/novo", icon: Ticket },
  { title: "Atribuição", url: "/chamados/atribuicao", icon: UserCog },
];

const analysisItems: NavItem[] = [
  { title: "Relatórios", url: "/relatorios", icon: BarChart3 },
  { title: "Mensagens", url: "/mensagens", icon: MessageSquare },
];

const systemItems: NavItem[] = [
  { title: "Configurações", url: "/configuracoes", icon: Settings },
  { title: "Logs", url: "/logs", icon: ScrollText },
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { signOut, isAdmin, isStaff } = useAuth();
  const navigate = useNavigate();

  const isActive = (url: string) =>
    pathname === url || pathname.startsWith(url + "/");

  async function handleLogout() {
    await signOut();
    navigate({ to: "/login", replace: true });
  }

  const renderGroup = (label: string, items: NavItem[]) => (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.url}>
              <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                <Link to={item.url}>
                  <item.icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="px-3 py-3.5">
        <div className="group-data-[collapsible=icon]:hidden">
          <JJLogo />
        </div>
        <div className="hidden justify-center group-data-[collapsible=icon]:flex">
          <JJLogo showText={false} />
        </div>
      </SidebarHeader>
      <SidebarContent className="px-1">
        {renderGroup("Operação", operationItems)}
        {!isStaff && renderGroup("Meu Espaço", techSelfItems)}
        {isStaff && renderGroup("Gestão de Técnicos", techManagementItems)}
        {isStaff && renderGroup("Clientes & Atendimento", customerItems)}
        {isStaff && renderGroup("Análise", analysisItems)}
        {isAdmin && renderGroup("Sistema", systemItems)}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} tooltip="Sair">
              <LogOut className="h-4 w-4" />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
