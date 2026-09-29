"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/components/AppContext";
import { CATEGORIES, type Category, type Game, LANGUAGES, SUBJECT_VAR, supabase } from "@/lib/supabase";

export default function NewInsultPage() {
  const { session, language, ready } = useApp();
  const router = useRouter();
  const textRef = useRef<HTMLTextAreaElement>(null);

  const [text, setText] = useState("");
  const [lang, setLang] = useState(language);
  const [category, setCategory] = useState<Category>("basico");
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGames, setSelectedGames] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => setLang(language), [language]);
  useEffect(() => {
    supabase
      .from("games")
      .select("id, name")
      .order("name")
      .then(({ data }) => setGames(data ?? []));
  }, []);

  if (ready && !session) {
    return (
      <p>
        Necesitas <Link href="/login">iniciar sesión</Link> para publicar.
      </p>
    );
  }

  const insertVar = () => {
    const el = textRef.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    const next = text.slice(0, start) + SUBJECT_VAR + text.slice(end);
    setText(next);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + SUBJECT_VAR.length, start + SUBJECT_VAR.length);
    });
  };

  const toggleGame = (id: string) =>
    setSelectedGames((g) => (g.includes(id) ? g.filter((x) => x !== id) : [...g, id]));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const clean = text.trim();
    if (!clean.includes(SUBJECT_VAR)) {
      setError(`El insulto debe incluir ${SUBJECT_VAR} en algún lugar.`);
      return;
    }
    if (clean.length < 10 || clean.length > 300) {
      setError("El insulto debe tener entre 10 y 300 caracteres.");
      return;
    }
    setSaving(true);
    const { data, error } = await supabase
      .from("insults")
      .insert({ text: clean, language: lang, category })
      .select("id")
      .single();
    if (error || !data) {
      setError(error?.message ?? "No se pudo publicar.");
      setSaving(false);
      return;
    }
    if (selectedGames.length > 0) {
      await supabase
        .from("insult_games")
        .insert(selectedGames.map((game_id) => ({ insult_id: data.id, game_id })));
    }
    router.push("/");
  };

  const preview = text.split(SUBJECT_VAR).join("Yasuo");

  return (
    <>
      <h1>Publicar insulto</h1>
      <form onSubmit={submit} className="form">
        <label>
          Insulto
          <textarea
            ref={textRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            maxLength={300}
            placeholder="Eres tan malo que hasta {SUJETO} juega mejor con el monitor apagado"
          />
        </label>
        <div className="row">
          <button type="button" className="btn ghost" onClick={insertVar}>
            Insertar {SUBJECT_VAR}
          </button>
          <span className="muted">{text.length}/300</span>
        </div>
        {text.includes(SUBJECT_VAR) && (
          <p className="preview">
            <span className="muted">Vista previa: </span>
            {preview}
          </p>
        )}

        <div className="row">
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
          <label>
            Categoría
            <select value={category} onChange={(e) => setCategory(e.target.value as Category)}>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <fieldset>
          <legend>Juegos (opcional, solo si usa jerga de un juego)</legend>
          <div className="chips">
            {games.map((g) => (
              <button
                type="button"
                key={g.id}
                className={`chip ${selectedGames.includes(g.id) ? "on" : ""}`}
                onClick={() => toggleGame(g.id)}
              >
                {g.name}
              </button>
            ))}
          </div>
        </fieldset>

        {error && <p className="error">{error}</p>}
        <button type="submit" className="btn" disabled={saving}>
          {saving ? "Publicando…" : "Publicar"}
        </button>
      </form>
    </>
  );
}
