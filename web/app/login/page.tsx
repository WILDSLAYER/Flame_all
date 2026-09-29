"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useApp } from "@/components/AppContext";
import { LANGUAGES, supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const { language } = useApp();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [lang, setLang] = useState(language);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) return setMsg(error.message);
      router.push("/");
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username, language: lang } },
      });
      setBusy(false);
      if (error) return setMsg(error.message);
      if (data.session) router.push("/");
      else setMsg("Te enviamos un correo para confirmar la cuenta.");
    }
  };

  return (
    <>
      <h1>{mode === "login" ? "Entrar" : "Crear cuenta"}</h1>
      <form onSubmit={submit} className="form narrow">
        {mode === "signup" && (
          <>
            <label>
              Nombre de usuario
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                minLength={3}
                maxLength={30}
                required
              />
            </label>
            <label>
              Idioma
              <select value={lang} onChange={(e) => setLang(e.target.value)}>
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
        <label>
          Correo
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
        </label>
        {msg && <p className="error">{msg}</p>}
        <button className="btn" disabled={busy}>
          {mode === "login" ? "Entrar" : "Crear cuenta"}
        </button>
        <button
          type="button"
          className="link"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
        >
          {mode === "login" ? "¿No tienes cuenta? Regístrate" : "¿Ya tienes cuenta? Entra"}
        </button>
      </form>
    </>
  );
}
