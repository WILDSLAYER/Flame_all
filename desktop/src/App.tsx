import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type Category,
  configured,
  detectGame,
  fetchCharacters,
  fetchGames,
  fetchInsults,
  fillSubject,
  type Game,
  type Insult,
  SUBJECT_VAR,
} from "./api";
import { DEFAULT_HOTKEY, keyEventToAccelerator, LANGUAGES, prettyHotkey, settings } from "./settings";

// true dentro de la app Tauri; false si se abre en un navegador normal (npm run dev)
const isTauri = "__TAURI_INTERNALS__" in window;

const CATEGORY_LABEL: Record<Category, string> = {
  basico: "Básico",
  intermedio: "Intermedio",
  ingenioso: "Ingenioso",
};

async function hideWindow() {
  if (isTauri) await invoke("hide_window");
}

export default function App() {
  const [games, setGames] = useState<Game[]>([]);
  const [gameId, setGameId] = useState<string | null>(null);
  const [autoDetected, setAutoDetected] = useState(false);
  const [characters, setCharacters] = useState<string[]>([]);
  const [character, setCharacter] = useState<string | null>(null);
  const [charSearch, setCharSearch] = useState("");
  const [insults, setInsults] = useState<Insult[]>([]);
  const [category, setCategory] = useState<Category | "todas">("todas");
  const [language, setLanguage] = useState(settings.language());
  const [tick, setTick] = useState(0); // fuerza recarga al mostrar la ventana
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // --- Detección del juego ------------------------------------------------
  const detect = useCallback(async () => {
    try {
      setError(null);
      const list = await fetchGames();
      setGames(list);
      const procs = isTauri ? await invoke<string[]>("list_processes") : [];
      const found = detectGame(list, procs);
      if (found) {
        setGameId(found.id);
        setAutoDetected(true);
      } else {
        setAutoDetected(false);
        setGameId((cur) => cur ?? list[0]?.id ?? null);
      }
    } catch {
      setError("Sin conexión con el servidor. Flame_all necesita internet.");
    }
  }, []);

  // Al iniciar y cada vez que se abre la ventana con el atajo
  useEffect(() => {
    if (!configured) return;
    detect();
    if (!isTauri) return;
    const un = listen("window-shown", () => {
      detect();
      setTick((t) => t + 1);
      setShowSettings(false);
      setTimeout(() => searchRef.current?.focus(), 50);
    });
    return () => {
      un.then((f) => f());
    };
  }, [detect]);

  // Aplica el atajo guardado por el usuario
  useEffect(() => {
    const saved = settings.hotkey();
    if (isTauri && saved !== DEFAULT_HOTKEY) {
      invoke("set_hotkey", { accelerator: saved }).catch(() => settings.setHotkey(DEFAULT_HOTKEY));
    }
  }, []);

  // --- Personajes del juego -----------------------------------------------
  useEffect(() => {
    if (!gameId) return;
    setCharSearch("");
    fetchCharacters(gameId)
      .then((list) => {
        setCharacters(list);
        const last = settings.lastCharacter(gameId);
        setCharacter(last && list.includes(last) ? last : null);
      })
      .catch(() => setError("No se pudieron cargar los personajes."));
  }, [gameId]);

  // --- Insultos (siempre desde el servidor: 100% online) -------------------
  useEffect(() => {
    if (!configured) return;
    setLoading(true);
    fetchInsults(language, gameId)
      .then((list) => {
        setInsults(list);
        setError(null);
      })
      .catch(() => setError("Sin conexión con el servidor. Flame_all necesita internet."))
      .finally(() => setLoading(false));
  }, [language, gameId, tick]);

  // Esc oculta la ventana
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !showSettings) hideWindow();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showSettings]);

  const visibleChars = useMemo(() => {
    const q = charSearch.trim().toLowerCase();
    return q ? characters.filter((c) => c.toLowerCase().includes(q)) : characters;
  }, [characters, charSearch]);

  const visibleInsults = useMemo(
    () => (category === "todas" ? insults : insults.filter((i) => i.category === category)),
    [insults, category]
  );

  const pickCharacter = (name: string) => {
    setCharacter(name);
    if (gameId) settings.setLastCharacter(gameId, name);
  };

  const copyInsult = async (ins: Insult) => {
    if (!character) {
      flash("Primero elige a quién va dirigido");
      searchRef.current?.focus();
      return;
    }
    const text = fillSubject(ins.text, character);
    try {
      if (isTauri) await writeText(text);
      else await navigator.clipboard.writeText(text);
      flash("¡Copiado! Pégalo con Ctrl+V");
      setTimeout(hideWindow, 450);
    } catch {
      flash("No se pudo copiar");
    }
  };

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1400);
  };

  const changeLanguage = (lang: string) => {
    setLanguage(lang);
    settings.setLanguage(lang);
  };

  if (!configured) {
    return (
      <div className="app center">
        <p>
          Falta configurar Supabase. Copia <code>.env.example</code> a <code>.env</code> y rellena{" "}
          <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="app">
      <header data-tauri-drag-region>
        <span className="brand" data-tauri-drag-region>
          🔥 Flame_all
        </span>
        <select
          value={gameId ?? ""}
          onChange={(e) => {
            setGameId(e.target.value);
            setAutoDetected(false);
          }}
          aria-label="Juego"
        >
          {games.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        {autoDetected && <span className="badge" title="Detectado automáticamente">● detectado</span>}
        <div className="spacer" data-tauri-drag-region />
        <select value={language} onChange={(e) => changeLanguage(e.target.value)} aria-label="Idioma">
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.code.toUpperCase()}
            </option>
          ))}
        </select>
        <button className="icon" onClick={() => setShowSettings((s) => !s)} title="Ajustes">
          ⚙
        </button>
        <button className="icon" onClick={hideWindow} title="Ocultar (Esc)">
          ✕
        </button>
      </header>

      {showSettings ? (
        <SettingsPanel onClose={() => setShowSettings(false)} />
      ) : (
        <>
          <section className="chars">
            <div className="section-head">
              <h2>¿A quién?</h2>
              <input
                ref={searchRef}
                placeholder="Buscar personaje…"
                value={charSearch}
                onChange={(e) => setCharSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && visibleChars.length > 0) pickCharacter(visibleChars[0]);
                }}
                autoFocus
              />
            </div>
            <div className="char-grid">
              {visibleChars.map((c) => (
                <button
                  key={c}
                  className={`chip ${c === character ? "on" : ""}`}
                  onClick={() => pickCharacter(c)}
                >
                  {c}
                </button>
              ))}
              {characters.length === 0 && <span className="muted">Sin personajes para este juego.</span>}
            </div>
          </section>

          <section className="insults">
            <div className="section-head">
              <h2>Insultos</h2>
              <div className="filters">
                {(["todas", "basico", "intermedio", "ingenioso"] as const).map((c) => (
                  <button
                    key={c}
                    className={`filter ${category === c ? "on" : ""}`}
                    onClick={() => setCategory(c)}
                  >
                    {c === "todas" ? "Todos" : CATEGORY_LABEL[c]}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="error">{error}</p>}
            {loading && insults.length === 0 && <p className="muted">Cargando…</p>}
            {!loading && !error && visibleInsults.length === 0 && (
              <p className="muted">No hay insultos en este idioma todavía. ¡Publica el primero en la web!</p>
            )}

            <ul>
              {visibleInsults.map((ins) => (
                <li key={ins.id}>
                  <button className="insult" onClick={() => copyInsult(ins)}>
                    <span className="text">
                      <InsultText text={ins.text} subject={character} />
                    </span>
                    <span className="likes">♥ {ins.likes_count}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function InsultText({ text, subject }: { text: string; subject: string | null }) {
  const parts = text.split(SUBJECT_VAR);
  return (
    <>
      {parts.map((p, i) => (
        <span key={i}>
          {i > 0 && <strong className="subject">{subject ?? SUBJECT_VAR}</strong>}
          {p}
        </span>
      ))}
    </>
  );
}

function SettingsPanel({ onClose }: { onClose: () => void }) {
  const [hotkey, setHotkey] = useState(settings.hotkey());
  const [capturing, setCapturing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!capturing) return;
    const onKey = async (e: KeyboardEvent) => {
      e.preventDefault();
      if (e.key === "Escape") {
        setCapturing(false);
        return;
      }
      const acc = keyEventToAccelerator(e);
      if (!acc) return; // aún solo modificadores
      setCapturing(false);
      try {
        if (isTauri) await invoke("set_hotkey", { accelerator: acc });
        settings.setHotkey(acc);
        setHotkey(acc);
        setMsg("Atajo guardado.");
      } catch (err) {
        setMsg(String(err));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [capturing]);

  return (
    <section className="settings">
      <h2>Ajustes</h2>
      <label>Atajo para abrir Flame_all</label>
      <div className="row">
        <button className={`hotkey ${capturing ? "capturing" : ""}`} onClick={() => setCapturing(true)}>
          {capturing ? "Pulsa la combinación…" : prettyHotkey(hotkey)}
        </button>
        {hotkey !== DEFAULT_HOTKEY && (
          <button
            className="link"
            onClick={async () => {
              if (isTauri) await invoke("set_hotkey", { accelerator: DEFAULT_HOTKEY });
              settings.setHotkey(DEFAULT_HOTKEY);
              setHotkey(DEFAULT_HOTKEY);
            }}
          >
            Restaurar
          </button>
        )}
      </div>
      {msg && <p className="muted">{msg}</p>}
      <p className="muted small">
        Consejo: juega en modo <b>ventana sin bordes</b> para que la ventana aparezca encima del juego
        sin minimizarlo.
      </p>
      <button className="btn" onClick={onClose}>
        Volver
      </button>
    </section>
  );
}
