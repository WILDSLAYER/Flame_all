"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CATEGORIES, type FeedInsult, SUBJECT_VAR, supabase } from "@/lib/supabase";
import { useApp } from "./AppContext";

function renderText(text: string) {
  const parts = text.split(SUBJECT_VAR);
  return parts.flatMap((p, i) =>
    i === 0
      ? [p]
      : [
          <span key={i} className="var">
            {SUBJECT_VAR}
          </span>,
          p,
        ]
  );
}

export function InsultList({
  insults,
  loading,
  showWeekly = false,
}: {
  insults: FeedInsult[];
  loading: boolean;
  showWeekly?: boolean;
}) {
  const { session } = useApp();
  const router = useRouter();
  const [liked, setLiked] = useState<Set<number>>(new Set());
  const [counts, setCounts] = useState<Record<number, number>>({});

  useEffect(() => {
    setCounts(Object.fromEntries(insults.map((i) => [i.id, i.likes_count])));
    if (!session || insults.length === 0) {
      setLiked(new Set());
      return;
    }
    supabase
      .from("likes")
      .select("insult_id")
      .eq("user_id", session.user.id)
      .in(
        "insult_id",
        insults.map((i) => i.id)
      )
      .then(({ data }) => setLiked(new Set((data ?? []).map((r) => r.insult_id as number))));
  }, [insults, session]);

  const toggleLike = async (id: number) => {
    if (!session) {
      router.push("/login");
      return;
    }
    const isLiked = liked.has(id);
    // Actualización optimista
    const next = new Set(liked);
    if (isLiked) next.delete(id);
    else next.add(id);
    setLiked(next);
    setCounts((c) => ({ ...c, [id]: (c[id] ?? 0) + (isLiked ? -1 : 1) }));

    const { error } = isLiked
      ? await supabase.from("likes").delete().eq("insult_id", id).eq("user_id", session.user.id)
      : await supabase.from("likes").insert({ insult_id: id });

    if (error) {
      // Revertir
      setLiked(liked);
      setCounts((c) => ({ ...c, [id]: (c[id] ?? 0) + (isLiked ? 1 : -1) }));
    }
  };

  if (loading) return <p className="muted">Cargando…</p>;
  if (insults.length === 0) return <p className="muted">Todavía no hay insultos en este idioma.</p>;

  return (
    <ul className="insults">
      {insults.map((ins) => (
        <li key={ins.id} className="card">
          <p className="insult-text">{renderText(ins.text)}</p>
          <div className="meta">
            <span className={`tag cat-${ins.category}`}>
              {CATEGORIES.find((c) => c.value === ins.category)?.label}
            </span>
            {ins.game_ids?.map((g) => (
              <span key={g} className="tag">
                {g}
              </span>
            ))}
            <span className="muted">por {ins.author_username ?? "anónimo"}</span>
            {showWeekly && ins.weekly_likes !== undefined && (
              <span className="muted">+{ins.weekly_likes} esta semana</span>
            )}
            <button
              className={`like ${liked.has(ins.id) ? "on" : ""}`}
              onClick={() => toggleLike(ins.id)}
              aria-pressed={liked.has(ins.id)}
            >
              ♥ {counts[ins.id] ?? ins.likes_count}
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
