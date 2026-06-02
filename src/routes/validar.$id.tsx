import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, BadgeCheck, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/validar/$id")({
  component: ValidatePage,
  head: () => ({
    meta: [
      { title: "Validar Crachá — JJ Informática" },
      { name: "description", content: "Validação pública de identidade do técnico." },
    ],
  }),
});

function ValidatePage() {
  const { id } = Route.useParams();

  const { data, isLoading } = useQuery({
    queryKey: ["validate-tech", id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_public_profile", { _id: id });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return row ?? null;
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-border shadow-floating">
        <CardContent className="p-6 space-y-5">
          <div className="flex items-center gap-2 text-primary">
            <ShieldCheck className="h-5 w-5" />
            <span className="font-display text-sm uppercase tracking-wider">Validação de Identidade</span>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !data ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <XCircle className="h-12 w-12 text-destructive" />
              <h2 className="font-display text-xl font-semibold">Crachá não encontrado</h2>
              <p className="text-sm text-muted-foreground">Este código não corresponde a um técnico válido.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 overflow-hidden rounded-full bg-muted ring-2 ring-primary/30">
                  {data.photo_url ? (
                    <img src={data.photo_url} alt={data.full_name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-muted-foreground">
                      {(data.full_name || "?").charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <h1 className="font-display text-xl font-semibold leading-tight truncate">{data.full_name}</h1>
                  <p className="text-sm text-muted-foreground truncate">{data.job_title || "Técnico"}</p>
                  <Badge variant="outline" className="mt-1 text-[10px] font-mono">{data.registration_code}</Badge>
                </div>
              </div>

              <div className="rounded-lg border border-success/30 bg-success/10 p-3 flex items-center gap-2">
                <BadgeCheck className="h-5 w-5 text-success" />
                <div>
                  <p className="text-sm font-medium text-success">Identidade verificada</p>
                  <p className="text-xs text-muted-foreground">Profissional autorizado · {data.company || "JJ Informática"}</p>
                </div>
              </div>

              {data.specialty && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Especialidade: </span>
                  <span className="font-medium">{data.specialty}</span>
                </div>
              )}
            </>
          )}

          <p className="text-[10px] text-center text-muted-foreground pt-2 border-t border-border">
            JJ Informática · Sistema de validação oficial
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
