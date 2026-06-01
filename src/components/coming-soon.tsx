import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  icon: LucideIcon;
  title: string;
  description: string;
}

export function ComingSoon({ icon: Icon, title, description }: Props) {
  return (
    <div className="mx-auto w-full max-w-[1500px] p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Módulo</p>
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
      </div>
      <Card className="border-dashed border-border shadow-soft">
        <CardContent className="flex flex-col items-center justify-center gap-3 p-16 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-xl bg-secondary text-primary">
            <Icon className="h-7 w-7" />
          </span>
          <h2 className="font-display text-lg font-semibold">Em construção</h2>
          <p className="max-w-md text-sm text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </div>
  );
}
