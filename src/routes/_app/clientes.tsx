import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";
import { Building2 } from "lucide-react";

export const Route = createFileRoute("/_app/clientes")({
  component: () => <ComingSoon icon={Building2} title="Clientes" description="Cadastro completo de clientes com histórico de atendimentos." />,
});
