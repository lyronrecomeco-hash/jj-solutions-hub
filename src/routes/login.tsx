import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, ShieldCheck, Activity, Cpu, Headset } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { JJLogo } from "@/components/jj-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { LoginAnimation } from "@/components/login-animation";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { signIn, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@painel.com");
  const [password, setPassword] = useState("admin1");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && user) navigate({ to: "/dashboard", replace: true });
  }, [user, authLoading, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await signIn(email, password);
    setSubmitting(false);
    if (error) {
      toast.error("Falha no acesso", { description: error });
    } else {
      toast.success("Acesso autorizado");
      navigate({ to: "/dashboard", replace: true });
    }
  }

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[1.1fr_1fr]">
      {/* Animated tech pane */}
      <aside className="relative hidden overflow-hidden lg:block">
        <LoginAnimation />
        <div className="relative z-10 flex h-full flex-col justify-between p-10 text-white xl:p-14">
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <JJLogo />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="max-w-lg space-y-7"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-white/80 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Service Desk · Online
            </span>
            <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight xl:text-[2.95rem]">
              Tecnologia que conecta sua equipe ao chamado certo.
            </h1>
            <p className="text-base leading-relaxed text-white/70">
              Plataforma unificada para gestão de chamados, técnicos de campo e
              relatórios operacionais — feita para times de TI que entregam SLA.
            </p>

            <div className="grid grid-cols-3 gap-3 pt-2">
              <Feature icon={<Activity className="h-4 w-4" />} title="SLA em tempo real" />
              <Feature icon={<Cpu className="h-4 w-4" />} title="Field Service" />
              <Feature icon={<Headset className="h-4 w-4" />} title="Atendimento 360°" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex items-center justify-between text-[11px] text-white/50"
          >
            <span>© {new Date().getFullYear()} JJ Informática — Soluções em Tecnologia</span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" /> Conexão segura
            </span>
          </motion.div>
        </div>
      </aside>

      {/* Form pane */}
      <main className="relative flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
        <div className="absolute right-5 top-5"><ThemeToggle /></div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="mb-8 lg:hidden">
            <JJLogo />
          </div>
          <div className="rounded-2xl border border-border bg-surface p-7 shadow-soft sm:p-8">
            <div className="mb-7">
              <h2 className="font-display text-2xl font-semibold tracking-tight">Bem-vindo</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Entre com suas credenciais corporativas para continuar.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Senha</Label>
                  <button type="button" className="text-xs font-medium text-primary hover:underline">
                    Esqueci minha senha
                  </button>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={show ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11 pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={show ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <Checkbox checked={remember} onCheckedChange={(v) => setRemember(!!v)} />
                Lembrar acesso neste dispositivo
              </label>

              <Button type="submit" disabled={submitting} className="h-11 w-full text-sm font-medium">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar"}
              </Button>
            </form>

            <div className="mt-6 flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-px flex-1 bg-border" />
              <span>Novo na plataforma?</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <button
              type="button"
              className="mt-4 w-full rounded-md border border-border bg-surface-muted py-2.5 text-sm font-medium text-foreground/80 transition hover:bg-accent"
            >
              Solicitar cadastro de técnico
            </button>

            <p className="mt-6 text-center text-[11px] text-muted-foreground">
              Ao continuar você concorda com os termos de uso e política de privacidade.
            </p>
          </div>
        </motion.div>
      </main>
    </div>
  );
}

function Feature({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 backdrop-blur-sm">
      <div className="mb-2 inline-flex h-7 w-7 items-center justify-center rounded-md bg-white/10 text-white/90">
        {icon}
      </div>
      <div className="text-[12px] font-medium leading-tight text-white/90">{title}</div>
    </div>
  );
}
