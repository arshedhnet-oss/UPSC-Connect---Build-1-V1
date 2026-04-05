import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { supabaseUntyped } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import type { User, Session } from "@supabase/supabase-js";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import SessionTimeoutWarning from "@/components/SessionTimeoutWarning";
import { sendEmailBatch } from "@/lib/sendEmail";

interface Profile {
  id: string;
  name: string;
  phone: string | null;
  email: string;
  role: "mentor" | "mentee" | "admin" | "institute_admin";
  avatar_url: string | null;
  created_at: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, meta: { name: string; phone: string; role: string }) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const getMenteeWelcomeStorageKey = (userId: string) => `mentee-welcome-sent-${userId}`;
const getAdminMenteeNotifKey = (userId: string) => `admin-mentee-notif-${userId}`;

async function sendMenteeOnboardingEmails(session: Session, profile: Profile) {
  if (!profile.email) return;

  const welcomeKey = getMenteeWelcomeStorageKey(profile.id);
  const adminKey = getAdminMenteeNotifKey(profile.id);
  const needsWelcome = !localStorage.getItem(welcomeKey);
  const needsAdmin = !localStorage.getItem(adminKey);

  if (!needsWelcome && !needsAdmin) return;

  const emails = [];

  if (needsWelcome) {
    emails.push({
      templateName: "mentee-welcome",
      recipientEmail: profile.email,
      idempotencyKey: `mentee-welcome-${profile.id}`,
      templateData: { menteeName: profile.name || "there" },
      accessToken: session.access_token,
    });
  }

  if (needsAdmin) {
    emails.push({
      templateName: "admin-mentee-signup",
      recipientEmail: "admin@upscconnect.in",
      idempotencyKey: `admin-mentee-signup-${profile.id}`,
      templateData: {
        menteeName: profile.name || "New User",
        menteeEmail: profile.email,
        menteePhone: profile.phone || "",
        signupTime: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
      },
      accessToken: session.access_token,
    });
  }

  const results = await sendEmailBatch(emails);

  results.forEach((result, i) => {
    const emailOpt = emails[i];
    if (result.success) {
      if (emailOpt.templateName === "mentee-welcome") localStorage.setItem(welcomeKey, "1");
      if (emailOpt.templateName === "admin-mentee-signup") localStorage.setItem(adminKey, "1");
    }
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const welcomeEmailInFlightRef = useRef<Set<string>>(new Set());

  const fetchProfile = async (userId: string, currentSession?: Session | null) => {
    const { data } = await supabaseUntyped
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (data) {
      const p = data as Profile;
      setProfile(p);

      // Send welcome email and admin notification for new mentee users
      const activeSession = currentSession || session;
      if (
        activeSession &&
        p.role === "mentee" &&
        !welcomeEmailInFlightRef.current.has(p.id)
      ) {
        welcomeEmailInFlightRef.current.add(p.id);
        void sendMenteeOnboardingEmails(activeSession, p).finally(() => {
          welcomeEmailInFlightRef.current.delete(p.id);
        });
      }
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    localStorage.removeItem("session_last_activity");
    localStorage.removeItem("session_critical_flow");
    navigate("/login");
  };

  const { showWarning, stayLoggedIn, logoutNow } = useSessionTimeout({
    onLogout: signOut,
    enabled: !!user,
  });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => fetchProfile(session.user.id, session), 0);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id, session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, meta: { name: string; phone: string; role: string }) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: meta },
    });
    if (error) throw error;
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signUp, signIn, signOut }}>
      {children}
      <SessionTimeoutWarning
        open={showWarning}
        onStayLoggedIn={stayLoggedIn}
        onLogout={logoutNow}
      />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
