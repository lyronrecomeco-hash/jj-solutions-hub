import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";
import { UserPlus } from "lucide-react";

export const Route = createFileRoute("/_app/cadastros-pendentes")({
  component: () => <ComingSoon icon={UserPlus} title="Cadastros Pendentes" description="Aprovação de novos usuários e técnicos." />,
});
