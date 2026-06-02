import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export function usePermissions() {
  const { user, isAdmin } = useAuth();
  const [menus, setMenus] = useState<Record<string, boolean> | null>(null);

  useEffect(() => {
    if (!user) { setMenus(null); return; }
    if (isAdmin) { setMenus(null); return; } // admin sees everything
    (async () => {
      const { data } = await (supabase.from("admin_permissions") as any)
        .select("permissions").eq("user_id", user.id).maybeSingle();
      const p = (data?.permissions ?? {}) as { menus?: Record<string, boolean> };
      setMenus(p.menus ?? null);
    })();
  }, [user, isAdmin]);

  function canMenu(key: string): boolean {
    if (isAdmin) return true;
    if (menus === null) return true; // sem registro = sem restrição
    return menus[key] !== false;
  }

  return { canMenu };
}
