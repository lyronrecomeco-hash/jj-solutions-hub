import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";
import { Ticket } from "lucide-react";

export const Route = createFileRoute("/_app/chamados")({
  component: () => (
    <ComingSoon
      icon={Ticket}
      title="Chamados"
      description="Módulo completo de chamados com listagem, filtros, prioridades e detalhamento será habilitado na próxima iteração."
    />
  ),
});
