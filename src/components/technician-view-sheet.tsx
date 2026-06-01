import { useNavigate } from "@tanstack/react-router";
import { IdCard, Mail, Phone, MapPin, Shield, Briefcase, MessageSquare } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type Tech = {
  id: string; full_name: string; email: string; phone: string | null;
  specialty: string | null; job_title: string | null; registration_code: string | null;
  employment_type: "field" | "clt" | "pj" | "internal"; photo_url: string | null;
  status: string;
};

const empLabel = { field: "Field", clt: "CLT", pj: "PJ", internal: "Interno" } as const;

export function TechnicianViewSheet({ tech, open, onOpenChange }: { tech: Tech | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const navigate = useNavigate();
  if (!tech) return null;
  const initials = tech.full_name.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-display text-lg">Perfil do técnico</SheetTitle>
          <SheetDescription className="text-xs">Visão completa de identificação e contato.</SheetDescription>
        </SheetHeader>

        <div className="mt-6 flex flex-col items-center text-center">
          <div className="h-24 w-24 overflow-hidden rounded-full border-2 border-primary/30 bg-surface-muted shadow-soft">
            {tech.photo_url
              ? <img src={tech.photo_url} alt="" className="h-full w-full object-cover" />
              : <div className="grid h-full w-full place-items-center bg-primary text-2xl font-bold text-primary-foreground">{initials}</div>}
          </div>
          <h3 className="mt-3 font-display text-lg font-semibold">{tech.full_name}</h3>
          <p className="text-xs text-muted-foreground">{tech.job_title ?? "Técnico"}</p>
          <div className="mt-3 flex items-center gap-2">
            <Badge variant="outline" className="uppercase">{empLabel[tech.employment_type]}</Badge>
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={`h-1.5 w-1.5 rounded-full ${tech.status === "online" ? "bg-success" : tech.status === "busy" ? "bg-warning" : "bg-muted-foreground/50"}`} />
              {tech.status}
            </span>
          </div>
        </div>

        <Separator className="my-6" />

        <div className="space-y-3 text-sm">
          <Row icon={Mail} label="Email" value={tech.email} />
          {tech.phone && <Row icon={Phone} label="Telefone" value={tech.phone} />}
          {tech.specialty && <Row icon={Briefcase} label="Especialidade" value={tech.specialty} />}
          {tech.registration_code && <Row icon={Shield} label="Matrícula" value={tech.registration_code} mono />}
          <Row icon={MapPin} label="Vínculo operacional" value={empLabel[tech.employment_type]} />
        </div>

        <Separator className="my-6" />

        <div className="grid gap-2">
          <Button onClick={() => navigate({ to: "/tecnicos/$id/cracha", params: { id: tech.id } })}>
            <IdCard className="h-4 w-4" /> Abrir crachá digital
          </Button>
          <Button variant="outline" onClick={() => navigate({ to: "/mensagens", search: { t: tech.id } as any })}>
            <MessageSquare className="h-4 w-4" /> Ver mensagens do técnico
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Row({ icon: Icon, label, value, mono }: { icon: any; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-surface px-3 py-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className={`truncate text-sm ${mono ? "font-mono" : ""}`}>{value}</div>
      </div>
    </div>
  );
}
