import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";
import { Settings } from "lucide-react";

export const Route = createFileRoute("/_app/configuracoes")({
  component: () => <ComingSoon icon={Settings} title="Configurações" description="Preferências do sistema, permissões e integrações." />,
});
