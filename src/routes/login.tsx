import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { JJLogo } from "@/components/jj-logo";
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
      {/* Quiet, minimal brand pane */}
      <aside className="relative hidden overflow-hidden lg:block">
        <LoginAnimation />
        <div className="relative z-10 flex h-full flex-col justify-between p-12 text-white xl:p-16">
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <JJLogo />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="max-w-md space-y-5"
          >
            <h1 className="font-display text-[2.1rem] font-semibold leading-tight tracking-tight xl:text-[2.4rem]">
              Service Desk para times de TI.
            </h1>
            <p className="text-[15px] leading-relaxed text-white/65">
              Gestão de chamados, técnicos de campo e relatórios operacionais
              em uma única plataforma.
            </p>
          </motion.div>

          <div className="flex items-center justify-between text-[11px] text-white/45">
            <span>© {new Date().getFullYear()} JJ Informática</span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" /> Conexão segura
            </span>
          </div>
        </div>
      </aside>

      {/* Form pane */}
      <main className="relative flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
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

