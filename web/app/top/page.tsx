"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/components/AppContext";
import { EMPTY_FILTER, Filters, type FilterValue } from "@/components/Filters";
import { InsultList } from "@/components/InsultList";
import { type FeedInsult, supabase } from "@/lib/supabase";

type Tab = "semanal" | "historico";

export default function TopPage() {
  const { language } = useApp();
  const [tab, setTab] = useState<Tab>("semanal");
  const [filter, setFilter] = useState<FilterValue>(EMPTY_FILTER);
  const [insults, setInsults] = useState<FeedInsult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    let req;
    if (tab === "semanal") {
      req = supabase.rpc("top_weekly", { p_language: language, p_limit: 100 });
    } else {
      let q = supabase.from("insults_feed").select("*").eq("language", language);
      if (filter.game) q = q.contains("game_ids", [filter.game]);
      if (filter.category) q = q.eq("category", filter.category);
      req = q.order("likes_count", { ascending: false }).limit(50);
    }
    req.then(({ data }) => {
      let list = (data as FeedInsult[]) ?? [];
      // El top semanal no trae juegos: solo se filtra por categoría
      if (tab === "semanal" && filter.category) list = list.filter((i) => i.category === filter.category);
      setInsults(list.slice(0, 50));
      setLoading(false);
    });
  }, [language, tab, filter]);

  return (
    <>
      <div className="page-head">
        <h1>Top</h1>
        <Filters value={filter} onChange={setFilter} showGame={tab === "historico"} />
      </div>
      <div className="tabs">
        <button className={tab === "semanal" ? "active" : ""} onClick={() => setTab("semanal")}>
          Semanal
        </button>
        <button className={tab === "historico" ? "active" : ""} onClick={() => setTab("historico")}>
          Histórico
        </button>
      </div>
      <InsultList insults={insults} loading={loading} showWeekly={tab === "semanal"} ranked />
    </>
  );
}
