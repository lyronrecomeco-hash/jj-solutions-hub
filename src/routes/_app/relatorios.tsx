import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";
import { BarChart3 } from "lucide-react";

export const Route = createFileRoute("/_app/relatorios")({
  component: () => <ComingSoon icon={BarChart3} title="Relatórios" description="Relatórios operacionais e exportações." />,
});
