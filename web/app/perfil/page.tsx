"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useApp } from "@/components/AppContext";
import { LANGUAGES, supabase } from "@/lib/supabase";

export default function ProfilePage() {
  const { session, profile, ready, setLanguage, refreshProfile } = useApp();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [lang, setLang] = useState("es");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setUsername(profile.username ?? "");
      setLang(profile.language);
    }
  }, [profile]);

  if (ready && !session) {
    return (
      <p>
        <Link href="/login">Inicia sesión</Link> para ver tu perfil.
      </p>
    );
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    const { error } = await supabase
      .from("profiles")
      .update({ username: username.trim() || null })
      .eq("id", session.user.id);
    if (error) return setMsg(error.message);
    await setLanguage(lang);
    await refreshProfile();
    setMsg("Guardado.");
  };

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <>
      <h1>Perfil</h1>
      <form onSubmit={save} className="form narrow">
        <p className="muted">{session?.user.email}</p>
        <label>
          Nombre de usuario
          <input value={username} onChange={(e) => setUsername(e.target.value)} maxLength={30} />
        </label>
        <label>
          Idioma de los insultos
          <select value={lang} onChange={(e) => setLang(e.target.value)}>
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </label>
        {msg && <p className="muted">{msg}</p>}
        <button className="btn">Guardar</button>
        <button type="button" className="btn ghost" onClick={logout}>
          Cerrar sesión
        </button>
      </form>
    </>
  );
}
