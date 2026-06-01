import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";
import { ScrollText } from "lucide-react";

export const Route = createFileRoute("/_app/logs")({
  component: () => <ComingSoon icon={ScrollText} title="Logs" description="Auditoria de eventos e ações dos usuários." />,
});
