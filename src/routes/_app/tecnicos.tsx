import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Search, IdCard, UserCog, Loader2, Mail, Phone } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_app/tecnicos")({ component: TechniciansPage });

type Row = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  specialty: string | null;
  job_title: string | null;
  registration_code: string | null;
  employment_type: "field" | "clt" | "pj" | "internal";
  status: string;
};

const employmentLabel: Record<Row["employment_type"], { label: string; cls: string }> = {
  field: { label: "Field", cls: "bg-info/15 text-info border-info/30" },
  clt: { label: "CLT", cls: "bg-success/15 text-success border-success/30" },
  pj: { label: "PJ", cls: "bg-warning/15 text-warning border-warning/30" },
  internal: { label: "Interno", cls: "bg-primary/15 text-primary border-primary/30" },
};

function TechniciansPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, specialty, job_title, registration_code, employment_type, status")
        .order("full_name");
      setRows((data ?? []) as Row[]);
      setLoading(false);
    })();
  }, []);

  const filtered = rows.filter((r) =>
    [r.full_name, r.email, r.specialty, r.registration_code]
      .filter(Boolean)
      .some((v) => v!.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Equipe Técnica</h1>
          <p className="text-sm text-muted-foreground">Gerencie técnicos, vínculos e acessos.</p>
        </div>
        <Button asChild>
          <Link to="/tecnicos/novo"><Plus className="h-4 w-4" /> Novo técnico</Link>
        </Button>
      </div>

      <div className="mb-4 max-w-sm">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome, email, especialidade, matrícula…"
            className="h-10 pl-9 bg-surface-muted"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-soft">
        <Table>
          <TableHeader>
            <TableRow className="bg-surface-muted/70">
              <TableHead>Técnico</TableHead>
              <TableHead>Especialidade</TableHead>
              <TableHead>Vínculo</TableHead>
              <TableHead>Matrícula</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                <Loader2 className="mx-auto h-5 w-5 animate-spin" />
              </TableCell></TableRow>
            )}
            {!loading && filtered.length === 0 && (
              <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                Nenhum técnico encontrado.
              </TableCell></TableRow>
            )}
            {filtered.map((r) => {
              const initials = r.full_name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
              const emp = employmentLabel[r.employment_type] ?? employmentLabel.field;
              return (
                <TableRow key={r.id} className="hover:bg-surface-muted/40">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="leading-tight">
                        <div className="text-sm font-semibold">{r.full_name}</div>
                        <div className="text-xs text-muted-foreground">{r.job_title ?? "—"}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{r.specialty ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={emp.cls}>{emp.label}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{r.registration_code ?? "—"}</TableCell>
                  <TableCell>
                    <div className="space-y-0.5 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5"><Mail className="h-3 w-3" />{r.email}</div>
                      {r.phone && <div className="flex items-center gap-1.5"><Phone className="h-3 w-3" />{r.phone}</div>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 text-xs">
                      <span className={`h-1.5 w-1.5 rounded-full ${r.status === "online" ? "bg-success" : r.status === "busy" ? "bg-warning" : "bg-muted-foreground/50"}`} />
                      {r.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="sm" variant="ghost">
                      <Link to="/tecnicos/$id/cracha" params={{ id: r.id }}>
                        <IdCard className="h-4 w-4" /> Crachá
                      </Link>
                    </Button>
                    <Button size="sm" variant="ghost">
                      <UserCog className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
