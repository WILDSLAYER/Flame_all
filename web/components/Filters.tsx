"use client";

import { useEffect, useState } from "react";
import { CATEGORIES, type Category, type Game, supabase } from "@/lib/supabase";

export interface FilterValue {
  game: string; // "" = todos
  category: Category | "";
}

export const EMPTY_FILTER: FilterValue = { game: "", category: "" };

let gamesCache: Game[] | null = null;

export function Filters({
  value,
  onChange,
  showGame = true,
}: {
  value: FilterValue;
  onChange: (v: FilterValue) => void;
  showGame?: boolean;
}) {
  const [games, setGames] = useState<Game[]>(gamesCache ?? []);

  useEffect(() => {
    if (gamesCache || !showGame) return;
    supabase
      .from("games")
      .select("id, name")
      .order("name")
      .then(({ data }) => {
        gamesCache = data ?? [];
        setGames(gamesCache);
      });
  }, [showGame]);

  return (
    <div className="filters">
      {showGame && (
        <select
          aria-label="Juego"
          value={value.game}
          onChange={(e) => onChange({ ...value, game: e.target.value })}
        >
          <option value="">Todos los juegos</option>
          {games.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      )}
      <select
        aria-label="Categoría"
        value={value.category}
        onChange={(e) => onChange({ ...value, category: e.target.value as Category | "" })}
      >
        <option value="">Todas las categorías</option>
        {CATEGORIES.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </select>
    </div>
  );
}
