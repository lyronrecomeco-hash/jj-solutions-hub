import { MessageSquare } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { useNotifications } from "@/hooks/use-notifications";

export function MessagesBell() {
  const { items } = useNotifications();
  const navigate = useNavigate();
  const unread = items.filter((n) => n.type === "message" && !n.read_at).length;

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative h-9 w-9"
      aria-label="Mensagens"
      onClick={() => navigate({ to: "/mensagens" })}
    >
      <MessageSquare className="h-4 w-4" />
      {unread > 0 && (
        <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Button>
  );
}