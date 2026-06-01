import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";
import { MessageSquare } from "lucide-react";

export const Route = createFileRoute("/_app/mensagens")({
  component: () => <ComingSoon icon={MessageSquare} title="Mensagens" description="Comunicação interna entre equipe e supervisores." />,
});
