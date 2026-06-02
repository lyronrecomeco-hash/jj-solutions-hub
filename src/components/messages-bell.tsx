import { MessageSquare } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export function MessagesBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: unread = 0 } = useQuery({
    queryKey: ["message-unread-count", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { count } = await (supabase.from("notifications") as any)
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .eq("type", "message")
        .is("read_at", null);
      return count ?? 0;
    },
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`msg-bell:${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => {
        qc.invalidateQueries({ queryKey: ["message-unread-count", user.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc, user]);

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