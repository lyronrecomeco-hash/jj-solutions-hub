import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { playNotificationSound } from "@/lib/notification-sound";

export type NotificationRow = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  entity: string | null;
  entity_id: string | null;
  read_at: string | null;
  created_at: string;
};

export function useNotifications() {
  const { user } = useAuth();
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const firstLoad = useRef(true);

  const refresh = useCallback(async () => {
    if (!user) { setItems([]); setLoading(false); return; }
    const { data } = await (supabase.from("notifications") as any)
      .select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
    setItems((data ?? []) as NotificationRow[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`notif:${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const n = payload.new as NotificationRow;
          setItems((prev) => [n, ...prev].slice(0, 50));
          if (!firstLoad.current) {
            playNotificationSound();
            toast(n.title, {
              description: n.body ?? undefined,
              duration: 10_000,
              action: n.link ? { label: "Abrir", onClick: () => { window.location.href = n.link!; } } : undefined,
            });
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const n = payload.new as NotificationRow;
          setItems((prev) => prev.map((x) => x.id === n.id ? n : x));
        },
      )
      .subscribe();
    firstLoad.current = false;
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const unreadCount = items.filter((n) => !n.read_at).length;

  const markRead = useCallback(async (id: string) => {
    await (supabase.from("notifications") as any).update({ read_at: new Date().toISOString() }).eq("id", id);
  }, []);

  const markAllRead = useCallback(async () => {
    if (!user) return;
    await (supabase.from("notifications") as any)
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id).is("read_at", null);
  }, [user]);

  return { items, unreadCount, loading, markRead, markAllRead, refresh };
}
