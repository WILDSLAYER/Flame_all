// Preferencias locales del usuario (solo en este PC)

export const LANGUAGES: { code: string; label: string }[] = [
  { code: "es", label: "Español" },
  { code: "en", label: "English" },
  { code: "pt", label: "Português" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "it", label: "Italiano" },
  { code: "pl", label: "Polski" },
  { code: "ru", label: "Русский" },
  { code: "tr", label: "Türkçe" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
  { code: "zh", label: "中文" },
];

export const DEFAULT_HOTKEY = "Ctrl+Shift+Space";

function get(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function set(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* sin almacenamiento: se usa el valor en memoria */
  }
}

export const settings = {
  language: () => get("language") ?? defaultLanguage(),
  setLanguage: (v: string) => set("language", v),
  hotkey: () => get("hotkey") ?? DEFAULT_HOTKEY,
  setHotkey: (v: string) => set("hotkey", v),
  sound: () => get("sound") !== "off",
  setSound: (on: boolean) => set("sound", on ? "on" : "off"),
  /** Último personaje elegido en cada juego */
  lastCharacter: (gameId: string) => get(`char:${gameId}`),
  setLastCharacter: (gameId: string, name: string) => set(`char:${gameId}`, name),
};

function defaultLanguage() {
  const nav = navigator.language.slice(0, 2);
  return LANGUAGES.some((l) => l.code === nav) ? nav : "es";
}

/** Convierte una pulsación de teclado a formato de atajo de Tauri. Ej: "Ctrl+Shift+Space". */
export function keyEventToAccelerator(e: KeyboardEvent): string | null {
  const mods: string[] = [];
  if (e.ctrlKey) mods.push("Ctrl");
  if (e.altKey) mods.push("Alt");
  if (e.shiftKey) mods.push("Shift");
  if (e.metaKey) mods.push("Super");

  let key: string | null = null;
  if (/^Key[A-Z]$/.test(e.code)) key = e.code.slice(3);
  else if (/^Digit[0-9]$/.test(e.code)) key = e.code.slice(5);
  else if (/^F([1-9]|1[0-9]|2[0-4])$/.test(e.code)) key = e.code;
  else if (["Space", "Tab", "Insert", "Home", "End", "PageUp", "PageDown"].includes(e.code))
    key = e.code;

  // Exige al menos un modificador (salvo teclas F) para no bloquear teclas normales del juego
  if (!key || (mods.length === 0 && !key.startsWith("F"))) return null;
  return [...mods, key].join("+");
}

/** Texto legible del atajo */
export function prettyHotkey(acc: string) {
  return acc.replace("Space", "Espacio").replace("Super", "Win");
}
