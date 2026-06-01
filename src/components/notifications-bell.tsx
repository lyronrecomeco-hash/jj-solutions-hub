import { Bell, Check, CheckCheck, MessageSquare, Ticket, UserPlus } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useNotifications, type NotificationRow } from "@/hooks/use-notifications";
import { ScrollArea } from "@/components/ui/scroll-area";

function iconFor(t: string) {
  switch (t) {
    case "ticket":  return Ticket;
    case "signup":  return UserPlus;
    case "message": return MessageSquare;
    default:        return Bell;
  }
}

function timeAgo(iso: string) {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60)  return "agora";
  if (d < 3600) return `${Math.floor(d / 60)} min`;
  if (d < 86400) return `${Math.floor(d / 3600)} h`;
  return `${Math.floor(d / 86400)} d`;
}

export function NotificationsBell() {
  const { items, unreadCount, markRead, markAllRead } = useNotifications();
  const navigate = useNavigate();

  const open = (n: NotificationRow) => {
    if (!n.read_at) markRead(n.id);
    if (n.link) navigate({ to: n.link as any });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 relative" aria-label="Notificações">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[360px] p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
          <div className="text-sm font-semibold">Notificações</div>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline">
              <CheckCheck className="h-3 w-3" /> Marcar todas como lidas
            </button>
          )}
        </div>
        <ScrollArea className="max-h-[400px]">
          {items.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">Sem notificações.</div>
          ) : (
            <ul className="py-1">
              {items.map((n) => {
                const Icon = iconFor(n.type);
                const unread = !n.read_at;
                return (
                  <li key={n.id}>
                    <button
                      onClick={() => open(n)}
                      className={`flex w-full items-start gap-3 px-3 py-2.5 text-left transition hover:bg-surface-muted ${unread ? "bg-primary/[0.04]" : ""}`}
                    >
                      <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg ${unread ? "bg-primary/10 text-primary" : "bg-surface-muted text-muted-foreground"}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className={`truncate text-sm ${unread ? "font-semibold" : "font-medium"}`}>{n.title}</div>
                          {unread && <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                        </div>
                        {n.body && <div className="line-clamp-2 text-xs text-muted-foreground">{n.body}</div>}
                        <div className="mt-0.5 text-[10px] text-muted-foreground">{timeAgo(n.created_at)}</div>
                      </div>
                      {!unread && <Check className="mt-1 h-3 w-3 shrink-0 text-muted-foreground/60" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
