import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck, Ticket, Users, MessageSquare, BarChart3, Sparkles,
  ChevronLeft, ChevronRight, IdCard, MapPin, Settings,
} from "lucide-react";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

type Step = { icon: any; title: string; desc: string };

const ADMIN_STEPS: Step[] = [
  { icon: ShieldCheck, title: "Bem-vindo à plataforma JJ", desc: "Aqui você administra toda a operação: chamados, equipe, clientes e relatórios em um só lugar." },
  { icon: Ticket,      title: "Gestão de Chamados",        desc: "Crie, distribua e acompanhe atendimentos com status, SLA e prioridade. Use o Kanban ou a lista, como preferir." },
  { icon: Users,       title: "Equipe Técnica",            desc: "Cadastre técnicos, gere crachás e acompanhe a localização e o desempenho de cada profissional em tempo real." },
  { icon: BarChart3,   title: "Relatórios & Análise",      desc: "Acompanhe indicadores, taxa de resolução e produtividade por período para tomar decisões com dados." },
  { icon: Settings,    title: "Tudo configurável",         desc: "Personalize SLA, notificações, integrações e dados da organização em Configurações. Você está pronto." },
];

const TECH_STEPS: Step[] = [
  { icon: ShieldCheck, title: "Bem-vindo, técnico!",       desc: "Este é o seu painel de atendimento. Aqui você recebe os chamados, registra evidências e fala com a supervisão." },
  { icon: Ticket,      title: "Seus chamados",             desc: "Acompanhe os chamados atribuídos a você, atualize o status conforme atende e finalize com o relatório técnico." },
  { icon: MessageSquare, title: "Mensagens & Atendimento", desc: "Converse com a supervisão por atendimento. Toque em ‘Abrir atendimento’ para iniciar uma nova conversa." },
  { icon: IdCard,      title: "Seu crachá digital",        desc: "Em ‘Meus Dados’ você acessa seu crachá com QR válido para apresentar ao cliente." },
  { icon: MapPin,      title: "Tudo pronto",               desc: "Mantenha sua localização ativa durante o expediente e bom trabalho!" },
];

export function WelcomeTour() {
  const { user, profile, isStaff, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (loading || !user) return;
    const key = `welcome_seen_${user.id}`;
    if (localStorage.getItem(key) === "1") return;
    const t = window.setTimeout(() => setOpen(true), 400);
    return () => window.clearTimeout(t);
  }, [loading, user]);

  if (!user) return null;

  const steps = isStaff ? ADMIN_STEPS : TECH_STEPS;
  const isLast = step === steps.length - 1;
  const s = steps[step];

  function finish() {
    try { localStorage.setItem(`welcome_seen_${user!.id}`, "1"); } catch {}
    setOpen(false);
    setStep(0);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (o) setOpen(true); /* not closable until finish */ }}>
      <DialogContent
        className="max-w-lg p-0 overflow-hidden [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <div className="relative">
          <div className="flex items-center gap-2 border-b border-border bg-surface-muted/40 px-5 py-3">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {isStaff ? "Bem-vindo ao painel administrativo" : "Bem-vindo ao painel técnico"}
            </span>
            <span className="ml-auto text-[11px] font-medium text-muted-foreground">{step + 1} / {steps.length}</span>
          </div>

          <div className="relative min-h-[280px] overflow-hidden px-6 py-7 sm:px-8 sm:py-9">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="flex flex-col items-center text-center"
              >
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <s.icon className="h-7 w-7" />
                </span>
                <h2 className="mt-5 font-display text-xl font-semibold tracking-tight sm:text-2xl">{s.title}</h2>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-[15px]">{s.desc}</p>
                {step === 0 && profile?.full_name && (
                  <p className="mt-4 text-xs text-muted-foreground">
                    Olá, <span className="font-semibold text-foreground">{profile.full_name.split(" ")[0]}</span> · ótimo te ver por aqui.
                  </p>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="flex items-center justify-center gap-1.5 pb-2">
            {steps.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${i === step ? "w-6 bg-primary" : "w-1.5 bg-border"}`}
              />
            ))}
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-border bg-surface-muted/30 px-5 py-3">
            <Button
              variant="ghost" size="sm"
              onClick={() => setStep((x) => Math.max(0, x - 1))}
              disabled={step === 0}
            >
              <ChevronLeft className="h-4 w-4" /> Voltar
            </Button>
            {isLast ? (
              <Button size="sm" onClick={finish}>Começar a usar</Button>
            ) : (
              <Button size="sm" onClick={() => setStep((x) => Math.min(steps.length - 1, x + 1))}>
                Próximo <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
