import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertStaff(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles").select("role").eq("user_id", userId)
    .in("role", ["admin", "supervisor"]).maybeSingle();
  if (!data) throw new Error("Apenas a equipe gestora pode executar esta ação.");
}

const idSchema = z.object({ signup_id: z.string().uuid() });

export const holdTechnicianSignup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    const { error } = await supabaseAdmin
      .from("technician_signups")
      .update({ status: "on_hold", reviewed_by: context.userId, reviewed_at: new Date().toISOString() })
      .eq("id", data.signup_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteTechnicianSignup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertStaff(context.userId);
    const { error } = await supabaseAdmin
      .from("technician_signups").delete().eq("id", data.signup_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
