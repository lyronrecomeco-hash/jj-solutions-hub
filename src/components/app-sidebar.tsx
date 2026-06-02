import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard, Ticket, Users, Building2, BarChart3, MessageSquare,
  Settings, ScrollText, LogOut, IdCard, ClipboardList, UserCog, ShieldCheck, UserCircle,
} from "lucide-react";

import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from "@/components/ui/sidebar";
import { JJLogo } from "@/components/jj-logo";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import { supabase } from "@/integrations/supabase/client";

type NavItem = { title: string; url: string; icon: React.ComponentType<{ className?: string }>; key: string };

const operationItems: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, key: "dashboard" },
  { title: "Chamados", url: "/chamados", icon: Ticket, key: "chamados" },
  { title: "Mensagens", url: "/mensagens", icon: MessageSquare, key: "mensagens" },
];

const techSelfItems: NavItem[] = [
  { title: "Meu Perfil", url: "/meu-perfil", icon: UserCircle, key: "meu-perfil" },
  { title: "Meus Dados", url: "/meus-dados", icon: IdCard, key: "meus-dados" },
];

const techManagementItems: NavItem[] = [
  { title: "Equipe Técnica", url: "/tecnicos", icon: Users, key: "tecnicos" },
  { title: "Cadastros Pendentes", url: "/cadastros-pendentes", icon: ClipboardList, key: "cadastros-pendentes" },
  { title: "Atribuição", url: "/atribuicao", icon: UserCog, key: "atribuicao" },
];

const customerItems: NavItem[] = [
  { title: "Clientes", url: "/clientes", icon: Building2, key: "clientes" },
];

const analysisItems: NavItem[] = [
  { title: "Relatórios", url: "/relatorios", icon: BarChart3, key: "relatorios" },
];

const systemItems: NavItem[] = [
  { title: "Administradores", url: "/administradores", icon: ShieldCheck, key: "administradores" },
  { title: "Configurações", url: "/configuracoes", icon: Settings, key: "configuracoes" },
  { title: "Logs", url: "/logs", icon: ScrollText, key: "logs" },
];

function useMessagesUnread() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data = 0 } = useQuery({
    queryKey: ["sidebar-msg-unread", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { count } = await (supabase.from("notifications") as any)
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .eq("type", "message")
        .is("read_at", null);
      return count ?? 0;
    },
    staleTime: 15_000,
  });

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`sidebar-msg:${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => {
        qc.invalidateQueries({ queryKey: ["sidebar-msg-unread", user.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc, user]);

  return data as number;
}

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { signOut, isAdmin, isStaff } = useAuth();
  const { canMenu } = usePermissions();
  const navigate = useNavigate();
  const unreadMessages = useMessagesUnread();

  const isActive = (url: string) => pathname === url || pathname.startsWith(url + "/");

  async function handleLogout() {
    await signOut();
    navigate({ to: "/login", replace: true });
  }

  const badgeFor = (key: string) => {
    if (key === "mensagens" && unreadMessages > 0) return unreadMessages > 99 ? "99+" : String(unreadMessages);
    return null;
  };

  const renderGroup = (label: string, items: NavItem[]) => {
    const visible = items.filter((it) => canMenu(it.key));
    if (visible.length === 0) return null;
    return (
      <SidebarGroup>
        <SidebarGroupLabel>{label}</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {visible.map((item) => {
              const badge = badgeFor(item.key);
              return (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                    <Link to={item.url} className="relative">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                      {badge && (
                        <>
                          <span className="ml-auto grid h-5 min-w-[20px] place-items-center rounded-full bg-destructive px-1.5 text-[10px] font-bold leading-none text-destructive-foreground group-data-[collapsible=icon]:hidden">
                            {badge}
                          </span>
                          <span className="absolute right-1 top-1 hidden h-2 w-2 rounded-full bg-destructive group-data-[collapsible=icon]:block" />
                        </>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="px-3 py-3.5">
        <div className="group-data-[collapsible=icon]:hidden"><JJLogo /></div>
        <div className="hidden justify-center group-data-[collapsible=icon]:flex"><JJLogo showText={false} /></div>
      </SidebarHeader>
      <SidebarContent className="px-1">
        {renderGroup("Operação", operationItems)}
        {!isStaff && renderGroup("Meu Espaço", techSelfItems)}
        {isStaff && renderGroup("Gestão de Técnicos", techManagementItems)}
        {isStaff && renderGroup("Clientes", customerItems)}
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
