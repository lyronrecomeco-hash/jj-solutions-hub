import { useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Search, Loader2, UserCheck } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  ticketId: string | null;
  ticketNumber?: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

type Tech = { id: string; full_name: string; specialty: string | null; photo_url: string | null; status: string };

export function AssignTechDialog({ ticketId, ticketNumber, open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");

  const { data: techs = [], isLoading } = useQuery({
    queryKey: ["techs-assign-dialog"],
    enabled: open,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, specialty, photo_url, status")
        .order("full_name");
      return (data ?? []) as Tech[];
    },
  });

  const filtered = useMemo(() => {
    const term = q.toLowerCase().trim();
    if (!term) return techs;
    return techs.filter((t) =>
      [t.full_name, t.specialty].filter(Boolean).join(" ").toLowerCase().includes(term)
    );
  }, [techs, q]);

  const assign = useMutation({
    mutationFn: async (userId: string) => {
      if (!ticketId) throw new Error("Chamado inválido");
      const { error } = await supabase
        .from("tickets")
        .update({ assigned_to: userId, status: "in_progress", started_at: new Date().toISOString() })
        .eq("id", ticketId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Chamado atribuído");
      qc.invalidateQueries({ queryKey: ["tickets-list"] });
      qc.invalidateQueries({ queryKey: ["unassigned-tickets"] });
      qc.invalidateQueries({ queryKey: ["dashboard-tickets"] });
      onOpenChange(false);
      setQ("");
    },
    onError: (e: any) => toast.error("Falha ao atribuir", { description: e?.message }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-primary" />
            Atribuir técnico
          </DialogTitle>
          <DialogDescription>
            {ticketNumber ? `Chamado ${ticketNumber} · ` : ""}selecione um responsável para esse atendimento.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            placeholder="Buscar técnico…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-10 pl-9"
          />
        </div>

        <div className="-mx-1 max-h-[360px] overflow-y-auto px-1">
          {isLoading ? (
            <div className="py-10 text-center">
              <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Nenhum técnico encontrado.</div>
          ) : (
            <ul className="space-y-1">
              {filtered.map((t) => {
                const initials = (t.full_name || "JJ").split(" ").map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
                return (
                  <li key={t.id}>
                    <button
                      onClick={() => assign.mutate(t.id)}
                      disabled={assign.isPending}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg border border-transparent px-2 py-2 text-left transition hover:bg-surface-muted hover:border-border",
                        assign.isPending && "opacity-50"
                      )}
                    >
                      <Avatar className="h-9 w-9">
                        {t.photo_url && <AvatarImage src={t.photo_url} alt={t.full_name} />}
                        <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{t.full_name}</div>
                        <div className="truncate text-[11px] text-muted-foreground">{t.specialty ?? "Suporte geral"}</div>
                      </div>
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full",
                          t.status === "online" ? "bg-success" : t.status === "busy" ? "bg-amber-500" : "bg-muted-foreground/40"
                        )}
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
