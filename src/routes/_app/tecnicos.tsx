import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";
import { Users } from "lucide-react";

export const Route = createFileRoute("/_app/tecnicos")({
  component: () => (
    <ComingSoon
      icon={Users}
      title="Técnicos"
      description="Listagem da equipe, perfil profissional e crachá digital virão na próxima iteração."
    />
  ),
});
