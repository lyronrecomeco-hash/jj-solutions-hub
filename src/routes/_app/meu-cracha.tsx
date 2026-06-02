import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/_app/meu-cracha")({ component: Redir });

function Redir() {
  const navigate = useNavigate();
  useEffect(() => { navigate({ to: "/meus-dados", replace: true }); }, [navigate]);
  return null;
}
