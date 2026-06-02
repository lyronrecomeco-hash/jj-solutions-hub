import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "supervisor" | "senior_tech" | "tech";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  job_title: string | null;
  specialty: string | null;
  company: string | null;
  registration_code: string | null;
  phone: string | null;
  status: string;
}

interface AuthCtx {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isStaff: boolean;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let currentUid: string | null = null;
    const { data: sub } = supabase.auth.onAuthStateChange((evt, s) => {
      const nextUid = s?.user?.id ?? null;
      if (evt === "TOKEN_REFRESHED" && nextUid === currentUid) {
        return;
      }
      setSession(s);
      setUser(s?.user ?? null);
      if (!s?.user) {
        currentUid = null;
        setProfile(null);
        setRoles([]);
        return;
      }
      // Only reload profile when the user actually changes (SIGNED_IN / USER_UPDATED).
      // Ignore TOKEN_REFRESHED and INITIAL_SESSION to avoid flicker between routes.
      if (nextUid !== currentUid || evt === "USER_UPDATED") {
        currentUid = nextUid;
        setTimeout(() => loadProfile(s.user.id), 0);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        loadProfile(data.session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function loadProfile(uid: string) {
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
    ]);
    setProfile(p as Profile | null);
    setRoles(((r ?? []) as { role: AppRole }[]).map((x) => x.role));
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const isAdmin = roles.includes("admin");
  const isStaff = isAdmin || roles.includes("supervisor");

  return (
    <Ctx.Provider value={{ user, session, profile, roles, loading, signIn, signOut, isAdmin, isStaff }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
