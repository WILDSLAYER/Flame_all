import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const configured = Boolean(url && anonKey);

// La app de escritorio no inicia sesión: solo lee (RLS permite lectura pública)
const supabase = createClient(url ?? "http://localhost", anonKey ?? "missing-key", {
  auth: { persistSession: false, autoRefreshToken: false },
});

export const SUBJECT_VAR = "{SUJETO}";

export type Category = "basico" | "intermedio" | "ingenioso";

export interface Game {
  id: string;
  name: string;
  process_names: string[];
}

export interface Insult {
  id: number;
  text: string;
  category: Category;
  likes_count: number;
}

export async function fetchGames(): Promise<Game[]> {
  const { data, error } = await supabase
    .from("games")
    .select("id, name, process_names")
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function fetchCharacters(gameId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("characters")
    .select("name")
    .eq("game_id", gameId)
    .order("name");
  if (error) throw error;
  return (data ?? []).map((c) => c.name as string);
}

/** Insultos del idioma elegido: genéricos + los asociados al juego, ordenados por Me gusta. */
export async function fetchInsults(language: string, gameId: string | null): Promise<Insult[]> {
  const { data, error } = await supabase.rpc("insults_for_app", {
    p_language: language,
    p_game_id: gameId,
    p_limit: 200,
  });
  if (error) throw error;
  return (data as Insult[]) ?? [];
}

/** Busca, entre los procesos en ejecución, el primero que coincida con un juego conocido. */
export function detectGame(games: Game[], processes: string[]): Game | null {
  const running = new Set(processes);
  return games.find((g) => g.process_names.some((p) => running.has(p.toLowerCase()))) ?? null;
}

export function fillSubject(text: string, subject: string): string {
  return text.split(SUBJECT_VAR).join(subject);
}
