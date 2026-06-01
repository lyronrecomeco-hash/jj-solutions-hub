import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const employmentTypes = ["field", "clt", "pj", "internal"] as const;
const roles = ["admin", "supervisor", "senior_tech", "tech"] as const;

const createSchema = z.object({
  full_name: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(6).max(72),
  phone: z.string().max(40).optional().nullable(),
  cpf: z.string().max(20).optional().nullable(),
  rg: z.string().max(20).optional().nullable(),
  birth_date: z.string().optional().nullable(),
  job_title: z.string().max(80).optional().nullable(),
  specialty: z.string().max(120).optional().nullable(),
  registration_code: z.string().max(40).optional().nullable(),
  cep: z.string().max(15).optional().nullable(),
  address: z.string().max(160).optional().nullable(),
  address_number: z.string().max(20).optional().nullable(),
  address_complement: z.string().max(80).optional().nullable(),
  neighborhood: z.string().max(80).optional().nullable(),
  city: z.string().max(80).optional().nullable(),
  state: z.string().max(2).optional().nullable(),
  employment_type: z.enum(employmentTypes).default("field"),
  role: z.enum(roles).default("tech"),
});

async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Apenas administradores podem executar esta ação.");
}

export const createTechnician = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    const { data: created, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
    });
    if (authErr || !created.user) throw new Error(authErr?.message ?? "Falha ao criar usuário");

    const uid = created.user.id;

    const profilePayload = {
      full_name: data.full_name,
      email: data.email,
      phone: data.phone,
      cpf: data.cpf,
      rg: data.rg,
      birth_date: data.birth_date,
      job_title: data.job_title,
      specialty: data.specialty,
      registration_code: data.registration_code,
      cep: data.cep,
      address: data.address,
      address_number: data.address_number,
      address_complement: data.address_complement,
      neighborhood: data.neighborhood,
      city: data.city,
      state: data.state,
      employment_type: data.employment_type,
    };

    const { error: profErr } = await supabaseAdmin
      .from("profiles")
      .upsert({ id: uid, ...profilePayload }, { onConflict: "id" });
    if (profErr) throw new Error(profErr.message);

    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: uid, role: data.role }, { onConflict: "user_id,role" });
    if (roleErr) throw new Error(roleErr.message);

    return { ok: true, user_id: uid };
  });

const updateSignupSchema = z.object({
  signup_id: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
  reason: z.string().max(500).optional().nullable(),
});

export const reviewTechnicianSignup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updateSignupSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("technician_signups")
      .update({
        status: data.decision,
        rejection_reason: data.reason ?? null,
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", data.signup_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
