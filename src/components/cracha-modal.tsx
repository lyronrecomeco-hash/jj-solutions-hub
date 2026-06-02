import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, RotateCw, ShieldCheck } from "lucide-react";
import html2canvas from "html2canvas";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CrachaCard, type Tech } from "@/components/cracha-card";

interface Props {
  tech: Tech | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CrachaModal({ tech, open, onOpenChange }: Props) {
  const [flipped, setFlipped] = useState(false);
  const [auto, setAuto] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);

  async function download() {
    if (!cardRef.current) return;
    const canvas = await html2canvas(cardRef.current, {
      scale: 4, backgroundColor: null, useCORS: true, logging: false,
    });
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png", 1);
    link.download = `cracha-${tech?.full_name?.replace(/\s+/g, "-").toLowerCase() ?? "tecnico"}.png`;
    link.click();
  }

  if (!tech) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl overflow-hidden border-0 bg-transparent p-0 shadow-none [&>button]:text-white/70 [&>button]:hover:text-white"
      >
        <div className="relative rounded-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-8 shadow-2xl">
          {/* glow */}
          <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-50"
            style={{ background: "radial-gradient(circle at 50% 30%, oklch(0.55 0.16 258 / 0.35), transparent 60%)" }} />

          <div className="relative">
            <div className="mb-6 text-center text-white">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider">
                <ShieldCheck className="h-3 w-3" /> Crachá Digital
              </div>
              <h2 className="mt-3 font-display text-xl font-semibold tracking-tight">{tech.full_name}</h2>
              <p className="mt-1 text-[12px] text-white/55">Clique no crachá para virá-lo · vista 3D</p>
            </div>

            {/* 3D wrapper */}
            <div className="flex items-center justify-center [perspective:1400px]">
              <motion.div
                className="relative cursor-pointer [transform-style:preserve-3d]"
                onClick={() => setFlipped((f) => !f)}
                animate={
                  auto && !flipped
                    ? { rotateY: [-12, 12, -12], rotateX: [4, -4, 4] }
                    : { rotateY: flipped ? 180 : 0, rotateX: 0 }
                }
                transition={
                  auto && !flipped
                    ? { duration: 8, repeat: Infinity, ease: "easeInOut" }
                    : { duration: 0.7, ease: [0.22, 1, 0.36, 1] }
                }
                style={{ width: 300, height: 475 }}
              >
                {/* Front */}
                <div className="absolute inset-0 [backface-visibility:hidden]">
                  <CrachaCard tech={tech} ref={cardRef} />
                </div>

                {/* Back */}
                <div
                  className="absolute inset-0 overflow-hidden rounded-[18px] bg-gradient-to-br from-slate-50 to-slate-100 p-5 text-slate-800 ring-1 ring-black/10 [backface-visibility:hidden]"
                  style={{ transform: "rotateY(180deg)" }}
                >
                  <div className="mb-3 text-center">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">JJ Informática</div>
                    <div className="mt-0.5 text-[15px] font-bold">Termo de Conduta</div>
                  </div>
                  <ul className="space-y-2 text-[10.5px] leading-relaxed text-slate-600">
                    <li>1. Este crachá é pessoal, intransferível e deve ser portado durante todo o atendimento.</li>
                    <li>2. O profissional deve identificar-se ao cliente apresentando este crachá antes de iniciar qualquer serviço.</li>
                    <li>3. Em caso de perda, comunique imediatamente o suporte: <b>suporte@jjinformatica.app</b></li>
                    <li>4. O QR Code direciona à página oficial de validação da identidade.</li>
                  </ul>
                  <div className="absolute inset-x-5 bottom-5">
                    <div className="rounded-lg bg-slate-900 px-3 py-2 text-center text-[10px] font-medium text-white">
                      Documento válido — emitido eletronicamente
                    </div>
                    <div className="mt-2 text-center text-[9px] text-slate-400">
                      JJ Informática Soluções em Tecnologia · CNPJ 00.000.000/0001-00
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <Button size="sm" variant="secondary" onClick={() => { setAuto(false); setFlipped((f) => !f); }}>
                <RotateCw className="h-3.5 w-3.5" /> {flipped ? "Frente" : "Verso"}
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setAuto((a) => !a)}>
                {auto ? "Pausar rotação" : "Rotação automática"}
              </Button>
              <Button size="sm" onClick={download}>
                <Download className="h-3.5 w-3.5" /> Baixar imagem
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Silence unused import in older bundlers
void AnimatePresence;
