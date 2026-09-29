import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Mensaje claro si falta el .env.local
  console.error(
    "Faltan NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. Copia .env.example a .env.local."
  );
}

export const supabase = createClient(url ?? "http://localhost", anonKey ?? "missing-key");

export const SUBJECT_VAR = "{SUJETO}";

export type Category = "basico" | "intermedio" | "ingenioso";

export const CATEGORIES: { value: Category; label: string }[] = [
  { value: "basico", label: "Básico" },
  { value: "intermedio", label: "Intermedio" },
  { value: "ingenioso", label: "Ingenioso" },
];

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

export interface FeedInsult {
  id: number;
  text: string;
  language: string;
  category: Category;
  likes_count: number;
  created_at: string;
  author_username: string | null;
  game_ids?: string[];
  weekly_likes?: number;
}

export interface Game {
  id: string;
  name: string;
}
