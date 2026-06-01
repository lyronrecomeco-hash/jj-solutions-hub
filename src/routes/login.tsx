import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2, ShieldCheck, Activity, Users } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { JJLogo } from "@/components/jj-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/use-auth";
import heroImg from "@/assets/login-hero.jpg";

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
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* Institutional pane */}
      <aside className="relative hidden overflow-hidden bg-primary lg:block">
        <img
          src={heroImg}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-primary/80 to-primary/95" />
        <div className="relative z-10 flex h-full flex-col justify-between p-12 text-primary-foreground">
          <JJLogo />
          <div className="max-w-md space-y-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-foreground/70">
              Plataforma corporativa
            </p>
            <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight xl:text-5xl">
              Gestão inteligente de chamados técnicos.
            </h1>
            <p className="text-base text-primary-foreground/80">
              Centralize atendimentos, organize a equipe de campo e acompanhe cada
              serviço com a precisão que sua operação exige.
            </p>
            <div className="grid grid-cols-3 gap-4 pt-4">
              <Indicator icon={<Activity className="h-4 w-4" />} value="99,8%" label="SLA cumprido" />
              <Indicator icon={<Users className="h-4 w-4" />} value="+1.2k" label="Atendimentos/mês" />
              <Indicator icon={<ShieldCheck className="h-4 w-4" />} value="ISO" label="Padrão de segurança" />
            </div>
          </div>
          <p className="text-xs text-primary-foreground/60">
            © {new Date().getFullYear()} JJ Informática — Todos os direitos reservados
          </p>
        </div>
      </aside>

      {/* Form pane */}
      <main className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
        <div className="absolute right-5 top-5"><ThemeToggle /></div>
        <div className="w-full max-w-md">
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

            <p className="mt-6 text-center text-xs text-muted-foreground">
              Ao continuar você concorda com os termos de uso e política de privacidade.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

function Indicator({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="rounded-lg border border-primary-foreground/15 bg-primary-foreground/5 p-3 backdrop-blur-sm">
      <div className="mb-1.5 flex items-center gap-1.5 text-primary-foreground/80">{icon}</div>
      <div className="font-display text-lg font-semibold">{value}</div>
      <div className="text-[11px] text-primary-foreground/70">{label}</div>
    </div>
  );
}
