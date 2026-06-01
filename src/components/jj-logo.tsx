import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  showText?: boolean;
}

export function JJLogo({ className, showText = true }: Props) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="relative grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground shadow-soft">
        <span className="font-display text-sm font-bold tracking-tight">JJ</span>
        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-success" />
      </div>
      {showText && (
        <div className="flex flex-col leading-tight">
          <span className="font-display text-sm font-semibold tracking-tight">JJ Informática</span>
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Service Desk</span>
        </div>
      )}
    </div>
  );
}
