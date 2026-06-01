import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_app/meu-cracha")({ component: MyBadge });

function MyBadge() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle();
      if (data?.id) navigate({ to: "/tecnicos/$id/cracha", params: { id: data.id }, replace: true });
      else setLoading(false);
    })();
  }, [user, navigate]);

  if (loading) return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  return <div className="px-6 py-10 text-sm text-muted-foreground">Perfil não localizado.</div>;
}
