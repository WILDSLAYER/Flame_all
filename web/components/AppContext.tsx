"use client";

import type { Session } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { LANGUAGES, supabase } from "@/lib/supabase";

interface Profile {
  id: string;
  username: string | null;
  language: string;
}

interface AppState {
  session: Session | null;
  profile: Profile | null;
  language: string;
  setLanguage: (lang: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  ready: boolean;
}

const Ctx = createContext<AppState | null>(null);

function initialLanguage(): string {
  try {
    const saved = localStorage.getItem("lang");
    if (saved) return saved;
  } catch {}
  const nav = typeof navigator !== "undefined" ? navigator.language.slice(0, 2) : "es";
  return LANGUAGES.some((l) => l.code === nav) ? nav : "es";
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [language, setLang] = useState("es");
  const [ready, setReady] = useState(false);

  const loadProfile = useCallback(async (s: Session | null) => {
    if (!s) {
      setProfile(null);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("id, username, language")
      .eq("id", s.user.id)
      .single();
    if (data) {
      setProfile(data);
      setLang(data.language);
    }
  }, []);

  useEffect(() => {
    setLang(initialLanguage());
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await loadProfile(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      loadProfile(s);
    });
    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  const setLanguage = async (lang: string) => {
    setLang(lang);
    try {
      localStorage.setItem("lang", lang);
    } catch {}
    if (session) {
      await supabase.from("profiles").update({ language: lang }).eq("id", session.user.id);
    }
  };

  return (
    <Ctx.Provider
      value={{
        session,
        profile,
        language,
        setLanguage,
        refreshProfile: () => loadProfile(session),
        ready,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp debe usarse dentro de <AppProvider>");
  return ctx;
}
